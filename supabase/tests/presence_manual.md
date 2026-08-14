# Checklist manual de Presence

Use dois usuários de teste, A e B, depois que a migration social estiver aplicada.

1. Abra o DevRoyale autenticado como A.
2. Abra outra sessão autenticada como B e acesse `/amigos`.
3. Confirme que B vê A como `● Online` quando A é amigo de B.
4. Feche a aplicação/aba de A e aguarde o evento `sync` do Presence; A deve mudar para `○ Offline`.
5. Abra duas abas autenticadas como A; B deve continuar vendo uma única entrada de A.
6. Feche apenas uma aba de A; A deve continuar online por causa da outra presença.
7. Faça logout na última aba de A; o canal deve executar `untrack` e `removeChannel`, e B deve ver A offline após o próximo `sync`.

O teste não deve usar polling nem gravar status online em tabelas.
