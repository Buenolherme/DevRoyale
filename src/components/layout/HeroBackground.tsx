const leftCode = [
  'const arena = "DevRoyale";',
  'def enter_arena(dev):',
  '    dev.xp += solve(challenge)',
  'for bug in backlog:',
  '    debug(bug)',
  'skills.append("focus")',
  'const streak = wins + 1;',
  'await challenge.start();',
  'git checkout -b level-up',
  'git commit -m "level up"',
  'return nextLevel;',
]

const rightCode = [
  'type Warrior = Developer;',
  'if (bug) debug();',
  'SELECT xp, level FROM warriors;',
  'UPDATE profile SET xp = xp + 100;',
  '<main class="battle-arena">',
  '  <button>Fight</button>',
  '</main>',
  '.warrior { display: grid; }',
  'const rank = skills.map(train);',
  'npm run build',
  'npm run deploy',
  'COMMIT;',
]

const centerCode = [
  'import { courage } from "./skills";',
  'console.log("battle ready");',
  'while dev.level < mastery:',
  '    dev.train()',
  'CREATE TABLE achievements (...);',
  'git push origin victory',
  '<section data-arena="royale">',
  'background: linear-gradient(...);',
  'const bugs = code.filter(findBug);',
  'await Promise.all(challenges);',
  'python main.py --mode battle',
  'return nextLevel;',
]

const codeStreams = [
  { position: 'left-near', lines: leftCode },
  { position: 'center-far', lines: centerCode },
  { position: 'right-near', lines: rightCode },
] as const

export function HeroBackground() {
  return (
    <div className="hero-background" aria-hidden="true">
      <div className="hero-background__layer hero-background__layer--mesh" data-layer="mesh" />

      <div className="hero-background__glows" data-layer="glows">
        <span className="hero-background__glow hero-background__glow--red" />
        <span className="hero-background__glow hero-background__glow--gold" />
      </div>

      {codeStreams.map((stream) => (
        <div
          key={stream.position}
          className={`hero-background__code-stream hero-background__code-stream--${stream.position}`}
          data-layer={`code-${stream.position}`}
        >
          <div className="hero-background__code-track">
            {[0, 1].map((copy) => (
              <div
                key={`${stream.position}-copy-${copy}`}
                className="hero-background__code-sequence"
              >
                {stream.lines.map((line, index) => (
                  <span key={`${stream.position}-${copy}-${index}`}>{line}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="hero-background__impacts" data-layer="micro-impacts">
        {Array.from({ length: 2 }, (_, impactIndex) => (
          <span
            key={impactIndex}
            className={`hero-background__impact hero-background__impact--${
              impactIndex % 2 === 0 ? 'red' : 'gold'
            }`}
          >
            <span className="hero-background__impact-flash" />
            <span className="hero-background__impact-ring" />
            <span className="hero-background__impact-particles">
              {Array.from({ length: 4 }, (_, particleIndex) => (
                <span key={particleIndex} className="hero-background__impact-particle" />
              ))}
            </span>
          </span>
        ))}
      </div>

      <div className="hero-background__sparks" data-layer="sparks">
        {Array.from({ length: 8 }, (_, index) => (
          <span key={index} className="hero-background__spark" />
        ))}
      </div>

      <div className="hero-background__blur" data-layer="blur" />
      <div className="hero-background__vignette" data-layer="vignette" />
    </div>
  )
}
