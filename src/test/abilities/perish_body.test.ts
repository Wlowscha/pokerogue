import { Abilities } from "#enums/abilities";
import { Moves } from "#enums/moves";
import { Species } from "#enums/species";
import GameManager from "#test/utils/gameManager";
import Phaser from "phaser";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";


describe("Abilities - Perish Song", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;

  beforeAll(() => {
    phaserGame = new Phaser.Game({
      type: Phaser.HEADLESS,
    });
  });

  afterEach(() => {
    game.phaseInterceptor.restoreOg();
  });

  beforeEach(() => {
    game = new GameManager(phaserGame);
    game.override.battleType("single");
    game.override.disableCrits();

    game.override.enemySpecies(Species.MAGIKARP);
    game.override.enemyAbility(Abilities.BALL_FETCH);

    game.override.starterSpecies(Species.CURSOLA);
    game.override.ability(Abilities.PERISH_BODY);
    game.override.moveset([ Moves.SPLASH ]);
  });

  it("should trigger when hit with damaging move", async () => {
    game.override.enemyMoveset([ Moves.AQUA_JET ]);
    await game.classicMode.startBattle();
    const cursola = game.scene.getPlayerPokemon();
    const magikarp = game.scene.getEnemyPokemon();

    game.move.select(Moves.SPLASH);
    await game.toNextTurn();

    expect(cursola?.summonData.tags[0].turnCount).toBe(3);
    expect(magikarp?.summonData.tags[0].turnCount).toBe(3);
  });

  it("should trigger even when fainting", async () => {
    game.override.enemyMoveset([ Moves.AQUA_JET ])
      .enemyLevel(100)
      .startingLevel(1);
    await game.classicMode.startBattle([ Species.CURSOLA, Species.FEEBAS ]);
    const magikarp = game.scene.getEnemyPokemon();

    game.move.select(Moves.SPLASH);
    game.doSelectPartyPokemon(1);
    await game.toNextTurn();

    expect(magikarp?.summonData.tags[0].turnCount).toBe(3);
  });
});
