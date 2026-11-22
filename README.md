# Mentor de Valor

PWA (aplicativo instalável) que transforma ensinamentos de vídeos do YouTube com Flávio Augusto e Guto Galamba em missões práticas para o dia a dia, a carreira e os negócios.

- **Hoje**: missão em andamento, passo do dia, reflexão e sequência.
- **Mentor**: sessão guiada (desafio + momento → diagnóstico e lições recomendadas).
- **Biblioteca**: lições com exemplo por perfil, plano de 7 dias, perguntas do mentor e link para o minuto do vídeo.
- **Progresso**: diário, reflexões, vídeos analisados, PIN e backup.

Funciona offline e não tem servidor: perfil, progresso e PIN ficam salvos apenas no aparelho (localStorage).

## Atualizar conteúdo

As lições ficam em `data/licoes.json` e os vídeos em `data/videos.json`. Ao publicar novas lições, o app mostra o aviso de "lições novas" na próxima vez que for aberto.

Este app não é afiliado ao Flávio Augusto nem ao Guto Galamba e não fala em nome dele; as lições são paráfrases de conteúdo público.
