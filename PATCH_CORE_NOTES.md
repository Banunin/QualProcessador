# PATCH CORE - QualProcessador

Principais correções deste pacote:

- links internos com diferença de maiúsculas/minúsculas padronizados;
- páginas Comunidade/Ferramentas/Upscendra/WinFormatKit renomeadas para lowercase;
- redirects legados no Vercel para preservar URLs antigas;
- rewrite funcional para `/cpu/:marca/:cpu`;
- rewrites para as URLs limpas dos artigos atuais;
- painel de postagem agora gera rewrite compatível com `vercel.json`;
- artigo em destaque da home agora usa a URL limpa/canônica;
- `detalhes.html` agora resolve CPU por ID ou slug e sobrevive a F5 em URL amigável;
- `analises.html` passou a carregar `artigos.json` dinamicamente e a busca funciona;
- link incorreto do artigo 101 corrigido;
- falha de `artigos.json` agora exibe mensagem de erro útil;
- comentários mostram erros reais de INSERT/UPDATE/DELETE e detectam UPDATE bloqueado por RLS;
- edição inline foi endurecida contra quebra de `<textarea>`/injeção;
- fallback de imagem para `img/placeholder.webp` nas fichas de CPU;
- corrigido mismatch `1300x.webp` -> `1300X.webp`;
- metadata `seusite.com` removida da página Comunidade;
- canonicals e links institucionais alinhados ao domínio publicado `qualprocessador.vercel.app`;
- removido `dados copy.js`, arquivo duplicado e não referenciado;
- removido `detalhescopia.html`, que continha uma chave Supabase `service_role`;
- incluído `SUPABASE_PATCH_COMENTARIOS.sql` para corrigir políticas de edição/exclusão de comentários.

IMPORTANTE: rotacione a chave `service_role` do projeto Supabase, pois uma cópia antiga dela estava exposta no HTML enviado.
