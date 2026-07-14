export default async () => {
  const supabaseUrl=(
    process.env.VITE_SUPABASE_URL||
    process.env.SUPABASE_URL||
    ""
  ).trim();

  const supabaseAnonKey=(
    process.env.VITE_SUPABASE_ANON_KEY||
    process.env.SUPABASE_ANON_KEY||
    ""
  ).trim();

  const missing=[];
  if(!supabaseUrl)missing.push("VITE_SUPABASE_URL");
  if(!supabaseAnonKey)missing.push("VITE_SUPABASE_ANON_KEY");

  if(missing.length){
    return new Response(JSON.stringify({
      error:`Faltan variables en Netlify: ${missing.join(", ")}`
    }),{
      status:500,
      headers:{
        "content-type":"application/json; charset=utf-8",
        "cache-control":"no-store"
      }
    });
  }

  return new Response(JSON.stringify({
    supabaseUrl,
    supabaseAnonKey
  }),{
    status:200,
    headers:{
      "content-type":"application/json; charset=utf-8",
      "cache-control":"no-store, max-age=0"
    }
  });
};
