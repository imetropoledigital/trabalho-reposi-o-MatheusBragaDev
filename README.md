# Desafio Prático NoSQL: MongoDB + Redis

> **Componente Curricular:** IMD1130 — Bancos de Dados NoSQL  
> **Aluno:** Matheus Braga Oliveira
> **Link do Vídeo de Defesa:** https://drive.google.com/file/d/1EVkcUOuypVwE7jbc9BSakQT3bnUL4_un/view?usp=sharing

Este projeto implementa uma API REST de catálogo de produtos, registro de vendas e ranking em tempo real utilizando Node.js com Fastify. A arquitetura combina o MongoDB como banco persistente principal (fonte da verdade) e o Redis como camada de aceleração em memória.

## 🤖 Declaração de Uso de IA Generativa
Em conformidade com o regulamento da atividade, o modelo **Gemini Pro** foi utilizado como ferramenta auxiliar de engenharia. A IA atuou na aceleração da escrita do código bruto, estruturação das rotas Fastify, modelagem do validador de dados do MongoDB e depuração dos scripts de carga do k6. A responsabilidade técnica, testes de validação e análise crítica dos resultados contidos nesta entrega foram executados integralmente pelo aluno.

---

## 1. Justificativas e Decisões Técnicas

*   **Indexação no MongoDB:** Foi criado um índice de campo único no atributo `categoria` da coleção de produtos. Consultas de paginação e filtros por categoria são operações prioritárias no catálogo. O índice evita que o MongoDB execute um escaneamento linear de toda a coleção (`COLLSCAN`), reduzindo a busca para tempo logarítmico (`IXSCAN`).
*   **Validação de Dados ($jsonSchema):** Implementamos regras estritas de integridade direto na coleção do MongoDB. Isso blinda o banco contra dados corrompidos ou tipos inválidos antes mesmo da persistência acontecer.
*   **Aggregation Pipeline (Relatório):** A rota `/relatorios/vendas` executa uma agregação avançada de múltiplos estágios. Ela filtra vendas recentes (`$match`), consolida financeiramente os totais por produto (`$group`), realiza um *join* com a coleção de produtos para buscar os nomes reais sem duplicar dados em disco (`$lookup`), achata a estrutura (`$unwind`), projeta a saída limpa (`$project`) e ordena por maior faturamento (`$sort`).
*   **Cache-Aside e Invalidação (Redis):** O endpoint `GET /produtos/:id` busca primeiramente na memória RAM do Redis. Em caso de ausência (*miss*), o MongoDB é consultado e o cache é populado com TTL de 300 segundos. Para garantir a consistência absoluta e evitar dados desatualizados, qualquer operação de atualização (`PUT`) ou remoção (`DELETE`) executa uma invalidação ativa imediata (`DEL`) da chave no Redis.
*   **Ranking em Tempo Real (Sorted Sets):** Em vez de sobrecarregar o MongoDB computando somatórios de vendas a cada requisição, utilizamos a estrutura nativa de Sorted Set do Redis. O comando atômico `ZINCRBY` incrementa as vendas a cada novo pedido, e a rota `/ranking/mais-vendidos` lê o topo da lista instantaneamente com o comando `ZREVRANGE ... WITHSCORES`.
*   **Rate Limiting (Bônus):** Implementamos um controle de requisições por IP usando as funções `INCR` e `EXPIRE` do Redis, bloqueando abusos antes que eles consumam processamento da aplicação.

---

## 2. Relatório de Desempenho (k6)

Os dados abaixo isolam o tempo de resposta real de cada banco de dados obtido através de métricas customizadas (`Trend`) aplicadas sob estresse de 30 usuários simultâneos:

| Métrica Coletada     | Cenário A (Redis - Com Cache) | Cenário B (MongoDB - Sem Cache) | Impacto / Ganho Relativo                            |
| :--- ----------------| :---------------------------- | :------------------------------ | :-------------------------------------------------- |
| **Throughput Médio** | 380.82 req/s                  | 380.82 req/s                    | Capacidade total de vazão unificada                 |
| **Latência Média**   | 6.98 ms                       | 10.09 ms                        | Cache Redis 30.8% mais rápido na média              |
| **Latência p95**     | **21.12 ms**                  | **27.56 ms**                    | **Redução de 23.3% no pior caso sob carga**         |
| **Taxa de Erro (%)** | 0.00%                         | 0.00%                           | Estabilidade total (15.236 requisições com sucesso) |

### Análise Crítica dos Resultados
O teste de estresse comprovou a eficiência da arquitetura híbrida. Sob carga constante de 30 usuários simultâneos, a camada de cache em memória do Redis reduziu o tempo médio de resposta de 10.09ms para 6.98ms. No percentil p95 — indicador mais confiável para experiência do usuário por representar as 5% requisições mais lentas —, o Redis garantiu um teto de resposta de 21.12ms contra 27.56ms do MongoDB. 

Esse ganho se tornará ainda maior em cenários de produção reais com milhões de linhas, onde o MongoDB precisaria buscar dados fragmentados em disco, enquanto o Redis mantém o acesso em tempo constante $O(1)$ por operar puramente em memória RAM.

---

## 3. Instruções para Execução da Stack

Para subir o projeto completo (Aplicação + MongoDB + Redis) de forma integrada, execute o comando abaixo no terminal da raiz do repositório:

```bash
docker compose up --build


[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/JrbcaKGR)
