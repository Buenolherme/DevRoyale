import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, Card, CardDescription, CardTitle } from '@/components/ui'
import { getCurrentRoom } from '@/lib/room-service'
import { ROUTES, roomPath } from '@/routes/paths'
import type { Room } from '@/types'

export function MultiplayerArenaPage() {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const [room, setRoom] = useState<Room | null>(null)

  useEffect(() => {
    void getCurrentRoom().then(setRoom).catch(() => setRoom(null))
  }, [])

  return (
    <div className="page-container multiplayer-arena-placeholder">
      <Card variant="premium" className="mx-auto max-w-2xl text-center">
        <Badge variant="gold" className="mb-4">Arena pronta</Badge>
        <CardTitle className="text-3xl">Sincronização da Arena chega na próxima etapa</CardTitle>
        <CardDescription className="mx-auto mt-4 max-w-xl">
          O lobby, os jogadores e o início sincronizado já estão preparados. Código, placar e vencedor online ainda não fazem parte da V2.0C.
        </CardDescription>
        <p className="mt-5 font-mono text-xs text-muted">Referência futura: {matchId}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {room && <Button type="button" onClick={() => navigate(roomPath(room.code))}>Voltar ao lobby</Button>}
          <Button type="button" variant="secondary" onClick={() => navigate(ROUTES.MULTIPLAYER)}>Multiplayer</Button>
        </div>
      </Card>
    </div>
  )
}
