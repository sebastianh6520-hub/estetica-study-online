import { createClient } from "@supabase/supabase-js";

export default async (request) => {
  if(request.method!=="POST")return new Response("Method not allowed",{status:405});
  const url=process.env.VITE_SUPABASE_URL||process.env.SUPABASE_URL;
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!serviceKey)return new Response(JSON.stringify({error:"Servidor no configurado"}),{status:500});

  let body={};
  try{body=await request.json()}catch{}
  const email=String(body.email||"").trim().toLowerCase();
  const name=String(body.name||"").trim().slice(0,80);
  const message=String(body.message||"").trim().slice(0,500);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    return new Response(JSON.stringify({error:"Correo inválido"}),{status:400,headers:{"content-type":"application/json"}});
  }

  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:profile}=await admin.from("profiles").select("id").eq("email",email).maybeSingle();
  if(!profile){
    return new Response(JSON.stringify({ok:true}),{status:200,headers:{"content-type":"application/json"}});
  }

  const {error}=await admin.from("password_reset_requests").insert({email,name,message,status:"pending"});
  if(error)return new Response(JSON.stringify({error:error.message}),{status:500,headers:{"content-type":"application/json"}});
  return new Response(JSON.stringify({ok:true}),{status:200,headers:{"content-type":"application/json"}});
};
