import { createClient } from "@supabase/supabase-js";

export default async (request) => {
  if(request.method!=="POST")return new Response("Method not allowed",{status:405});
  const url=process.env.VITE_SUPABASE_URL||process.env.SUPABASE_URL;
  const anonKey=process.env.VITE_SUPABASE_ANON_KEY||process.env.SUPABASE_ANON_KEY;
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!anonKey||!serviceKey)return new Response(JSON.stringify({error:"Servidor no configurado"}),{status:500});

  const token=(request.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
  if(!token)return new Response(JSON.stringify({error:"No autorizado"}),{status:401});

  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:userData,error:userError}=await admin.auth.getUser(token);
  if(userError||!userData.user)return new Response(JSON.stringify({error:"Sesión inválida"}),{status:401});

  const {data:profile}=await admin.from("profiles").select("role").eq("id",userData.user.id).single();
  if(profile?.role!=="admin")return new Response(JSON.stringify({error:"Permisos insuficientes"}),{status:403});

  let body={};try{body=await request.json()}catch{}
  const id=String(body.id||"");
  const action=body.action==="reject"?"reject":"approve";
  const {data:reqRow,error:reqError}=await admin.from("password_reset_requests").select("*").eq("id",id).single();
  if(reqError||!reqRow)return new Response(JSON.stringify({error:"Solicitud no encontrada"}),{status:404});

  if(action==="approve"){
    const publicClient=createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const redirectTo=String(body.redirectTo||process.env.APP_URL||"").replace(/\/$/,"");
    const {error:resetError}=await publicClient.auth.resetPasswordForEmail(reqRow.email,{
      redirectTo:redirectTo||undefined
    });
    if(resetError)return new Response(JSON.stringify({error:resetError.message}),{status:500});
  }

  const {error:updateError}=await admin.from("password_reset_requests").update({
    status:action==="approve"?"approved":"rejected",
    reviewed_at:new Date().toISOString(),
    reviewed_by:userData.user.id
  }).eq("id",id);
  if(updateError)return new Response(JSON.stringify({error:updateError.message}),{status:500});

  return new Response(JSON.stringify({ok:true}),{status:200,headers:{"content-type":"application/json"}});
};
