import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const latenciaComCache = new Trend('duracao_com_cache');
const latenciaSemCache = new Trend('duracao_sem_cache');

export const options = {
  stages: [
    { duration: '10s', target: 30 },
    { duration: '20s', target: 30 },
    { duration: '10s', target: 0 },
  ],
};

const ID_PRODUTO_VALIDO = '6a4fc3fc30a29ba073cb890c'; 

export default function () {
  const params = { headers: { 'Content-Type': 'application/json' } };
  
  const resCom = http.get(`http://localhost:3000/produtos/${ID_PRODUTO_VALIDO}`, params);
  latenciaComCache.add(resCom.timings.duration); // Isola o tempo do Redis
  check(resCom, { 'Com Cache - Status 200': (r) => r.status === 200 });

  sleep(0.05);

  const resSem = http.get(`http://localhost:3000/produtos/${ID_PRODUTO_VALIDO}?bypassCache=true`, params);
  latenciaSemCache.add(resSem.timings.duration); // Isola o tempo do Mongo
  check(resSem, { 'Sem Cache - Status 200': (r) => r.status === 200 });

  sleep(0.05);
}