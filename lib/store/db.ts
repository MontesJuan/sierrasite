import {Pool,type PoolClient} from 'pg';
const globalStore=globalThis as unknown as {sierraStorePool?:Pool};
export function db(){
 if(!process.env.STORE_DATABASE_URL)throw Error('La tienda no está disponible. Intentá de nuevo más tarde.');
 return globalStore.sierraStorePool??=new Pool({connectionString:process.env.STORE_DATABASE_URL,max:3,connectionTimeoutMillis:8000,idleTimeoutMillis:15000,statement_timeout:15000});
}
export async function transaction<T>(run:(client:PoolClient)=>Promise<T>){
 const client=await db().connect();
 try{await client.query('BEGIN');const result=await run(client);await client.query('COMMIT');return result;}
 catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
