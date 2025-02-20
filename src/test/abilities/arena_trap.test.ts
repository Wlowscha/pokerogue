import { allAbilities } from "#app/data/ability";
import { Abilities } from "#enums/abilities";
import { Moves } from "#enums/moves";
import { Species } from "#enums/species";
import GameManager from "#test/utils/gameManager";
import Phaser from "phaser";
import { afterEach, beforeAll, beforeEach, describe, it, expect, vi } from "vitest";

describe("Abilities - Arena Trap", () => {
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
    game.override
      .moveset(Moves.SPLASH)
      .ability(Abilities.ARENA_TRAP)
      .enemySpecies(Species.RALTS)
      .enemyAbility(Abilities.BALL_FETCH)
      .enemyMoveset(Moves.TELEPORT);
  });

  // TODO: Enable test when Issue #935 is addressed
  it.todo("should not allow grounded Pokémon to flee", async () => {
    game.override.battleType("single");

    await game.classicMode.startBattle();

    const enemy = game.scene.getEnemyPokemon();

    game.move.select(Moves.SPLASH);

    await game.toNextTurn();

    expect(enemy).toBe(game.scene.getEnemyPokemon());
  });

  it("should increase the chance of double battles", async () => {
    game.override
      .moveset(Moves.SPLASH)
      .ability(Abilities.ARENA_TRAP)
      .enemySpecies(Species.SUNKERN)
      .enemyAbility(Abilities.BALL_FETCH)
      .enemyMoveset(Moves.SPLASH)
      .startingWave(9);

    vi.spyOn(game.scene, "getDoubleBattleChance");
    await game.classicMode.startBattle();

    let expected: number = 8;
    game.move.select(Moves.SPLASH);
    if (game.scene.currentBattle.double) {
      game.move.select(Moves.SPLASH);
      expected = 2;
    }
    await game.doKillOpponents();
    await game.toNextWave();
    expect(game.scene.getDoubleBattleChance).toHaveLastReturnedWith(expected);

    expected = 2;
    game.move.select(Moves.SPLASH);
    if (game.scene.currentBattle.double) {
      game.move.select(Moves.SPLASH);
      expected = 1;
    }
    await game.doKillOpponents();
    await game.toNextWave();
    expect(game.scene.getDoubleBattleChance).toHaveLastReturnedWith(expected);
  });

  /**
   * This checks if the Player Pokemon is able to switch out/run away after the Enemy Pokemon with {@linkcode Abilities.ARENA_TRAP}
   * is forcefully moved out of the field from moves such as Roar {@linkcode Moves.ROAR}
   *
   * Note: It should be able to switch out/run away
   */
  it("should lift if pokemon with this ability leaves the field", async () => {
    game.override
      .battleType("double")
      .enemyMoveset(Moves.SPLASH)
      .moveset([ Moves.ROAR, Moves.SPLASH ])
      .ability(Abilities.BALL_FETCH);
    await game.classicMode.startBattle([ Species.MAGIKARP, Species.SUDOWOODO, Species.LUNATONE ]);

    const [ enemy1, enemy2 ] = game.scene.getEnemyField();
    const [ player1, player2 ] = game.scene.getPlayerField();

    vi.spyOn(enemy1, "getAbility").mockReturnValue(allAbilities[Abilities.ARENA_TRAP]);

    game.move.select(Moves.ROAR);
    game.move.select(Moves.SPLASH, 1);

    // This runs the fist command phase where the moves are selected
    await game.toNextTurn();
    // During the next command phase the player pokemons should not be trapped anymore
    game.move.select(Moves.SPLASH);
    game.move.select(Moves.SPLASH, 1);
    await game.toNextTurn();

    expect(player1.isTrapped()).toBe(false);
    expect(player2.isTrapped()).toBe(false);
    expect(enemy1.isOnField()).toBe(false);
    expect(enemy2.isOnField()).toBe(true);
  });
});
