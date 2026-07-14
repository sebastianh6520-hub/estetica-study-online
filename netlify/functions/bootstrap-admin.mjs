import { createClient } from "@supabase/supabase-js";

export default async () => {
  const url=process.env.VITE_SUPABASE_URL||process.env.SUPABASE_URL;
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email=(process.env.ADMIN_EMAIL||"").trim().toLowerCase();
  const password=process.env.ADMIN_PASSWORD||"";
  if(!url||!serviceKey||!email||!password){
    return new Response(JSON.stringify({configured:false}),{status:200,headers:{"content-type":"application/json"}});
  }

  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:list,error:listError}=await admin.auth.admin.listUsers({page:1,perPage:1000});
  if(listError)return new Response(JSON.stringify({error:listError.message}),{status:500});

  let user=(list.users||[]).find(u=>(u.email||"").toLowerCase()===email);
  if(!user){
    const {data,error}=await admin.auth.admin.createUser({
      email,password,email_confirm:true,user_metadata:{full_name:"Administrador"}
    });
    if(error)return new Response(JSON.stringify({error:error.message}),{status:500});
    user=data.user;
  }

  const {error:profileError}=await admin.from("profiles").upsert({
    id:user.id,email,full_name:user.user_metadata?.full_name||"Administrador",role:"admin",updated_at:new Date().toISOString()
  });
  if(profileError)return new Response(JSON.stringify({error:profileError.message}),{status:500});

  return new Response(JSON.stringify({configured:true}),{status:200,headers:{"content-type":"application/json"}});
};
