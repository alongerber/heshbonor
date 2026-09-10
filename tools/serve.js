// A static server that honours Range the way a real CDN does, so the
// 206 path the service worker has to survive is actually exercised.
const http=require('http'), fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
const TYPES={'.html':'text/html;charset=utf-8','.js':'text/javascript','.json':'application/json',
 '.mp3':'audio/mpeg','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg',
 '.woff2':'font/woff2','.webmanifest':'application/manifest+json','.md':'text/markdown'};
let ranged=0, plain=0;   /* so a run can show which paths were exercised */
const srv=http.createServer((req,res)=>{
  let u=decodeURIComponent(req.url.split('?')[0]);
  if(u==='/') u='/index.html';
  const f=path.join(ROOT,u);
  if(!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){
    res.writeHead(404); return res.end('no') }
  const size=fs.statSync(f).size;
  const type=TYPES[path.extname(f)]||'application/octet-stream';
  const range=req.headers.range;
  if(range){
    ranged++;
    const m=/bytes=(\d*)-(\d*)/.exec(range);
    const start=m[1]?parseInt(m[1]):0;
    const end=m[2]?parseInt(m[2]):size-1;
    res.writeHead(206,{'Content-Type':type,'Accept-Ranges':'bytes',
      'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});
    return fs.createReadStream(f,{start,end}).pipe(res);
  }
  plain++;
  res.writeHead(200,{'Content-Type':type,'Accept-Ranges':'bytes','Content-Length':size});
  fs.createReadStream(f).pipe(res);
});
srv.listen(8899,'127.0.0.1',()=>console.log('range-capable server on 8899'));
process.on('SIGTERM',()=>{ console.log('ranged:',ranged,'plain:',plain); process.exit(0) });
process.on('SIGINT',()=>{ console.log('ranged:',ranged,'plain:',plain); process.exit(0) });
