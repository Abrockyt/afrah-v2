import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const storage=fileURLToPath(new URL('../private/enquiries/',import.meta.url));
export async function enquiries(req,res,next){
 if(req.url?.split('?')[0]!=='/api/enquiries')return next();
 res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
 const reply=(code,value)=>{res.writeHead(code);res.end(JSON.stringify(value))};
 if(req.method!=='POST')return reply(405,{error:'Method not allowed'});
 let body='';try{for await(const chunk of req){body+=chunk;if(body.length>12000)return reply(413,{error:'Enquiry is too long'});}const data=JSON.parse(body);
 const name=String(data.name||'').trim(),email=String(data.email||'').trim();
 if(!name||name.length>120||email.length>200||!/^\S+@\S+\.\S+$/.test(email)||data.consent!=='yes')return reply(400,{error:'Please provide your name, email and consent.'});
 const id=randomUUID(),reference='AF-'+id.slice(0,8).toUpperCase();await mkdir(storage,{recursive:true});await writeFile(storage+id+'.json',JSON.stringify({reference,receivedAt:new Date().toISOString(),name,email,phone:String(data.phone||'').slice(0,50),interest:String(data.interest||'viewing').slice(0,80),residence:data.residence?String(data.residence).slice(0,20):null,consent:true},null,2),{flag:'wx'});reply(201,{reference});
 }catch{reply(400,{error:'We could not save this enquiry. Please try again.'});}
}
