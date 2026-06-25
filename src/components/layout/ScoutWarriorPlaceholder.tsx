import scoutHomeImage from '@/assets/scout/scout-home.png'
import { ScoutMascot } from './ScoutMascot'

export function ScoutWarriorPlaceholder() {
  return (
    <div className="hero-scout-free scout-hero-wrap relative flex min-h-[550px] items-center justify-center overflow-visible px-0 pb-4 pt-5 sm:min-h-[620px] lg:min-h-[730px] lg:pb-0 lg:pt-7">
      <div className="scout-hero-glow" aria-hidden="true" />

      <ScoutMascot
        src={scoutHomeImage}
        alt="Scout Guerreiro"
        message="Pronto para a próxima batalha, Dev?"
        className="scout-mascot--hero scout-mascot--warrior"
        bubbleClassName="scout-hero-quote scout-hero-quote--upper-left"
        imageClassName="scout-hero-image"
        width={1086}
        height={1448}
        fetchPriority="high"
        stageEffects={
          <>
            <div className="scout-hero-sparks scout-hero-sparks--sword">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="scout-hero-sparks scout-hero-sparks--crown">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="scout-hero-ambient-particles">
              <span />
              <span />
              <span />
            </div>
          </>
        }
      />
    </div>
  )
}
