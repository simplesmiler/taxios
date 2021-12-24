import Koa from 'koa';
import KoaRouter from 'koa-router';
// import json from 'koa-json';
// import body from 'koa-body';
import fs from 'fs';

async function main(): Promise<void> {
  const app = new Koa();
  const PORT = 5000;

  /** Middlewares **/
  // app.use(json());
  // app.use(body({ multipart: true }));

  /** Routes **/
  const router = new KoaRouter();
  router.get('/', (ctx) => {
    ctx.type = 'text/html;encoding=utf-8';
    ctx.body = fs.createReadStream('./src/index.html');
  });
  router.post('/echo', async (ctx) => {
    const contentType = ctx.headers['content-type'];
    if (contentType) {
      ctx.set('content-type', contentType);
    }
    console.log('Echoing content-type:', contentType);

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const buffers: Buffer[] = [];
      ctx.req.on('data', (chunk) => {
        buffers.push(chunk);
      });
      ctx.req.on('end', () => {
        const buffer = Buffer.concat(buffers);
        resolve(buffer);
      });
      ctx.req.on('error', (err) => {
        console.error(err);
        reject(err);
      });
    });

    const head = buffer.slice(0, 16).toString('hex');
    console.log('Echoing bytes:', head);
    ctx.body = buffer;
  });
  app.use(router.routes());

  const server = await app.listen(PORT);
  const address = server.address();
  const actualAddress =
    typeof address === 'string' ? address : address ? `${address.address}:${address.port}` : 'Unknown address';
  console.info(`Server started: ${actualAddress}`);
  await new Promise((resolve) => process.on('SIGINT', resolve));
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
