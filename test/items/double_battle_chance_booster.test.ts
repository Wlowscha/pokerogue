import { MoveId } from "#enums/move-id";
import { SpeciesId } from "#enums/species-id";
import GameManager from "#test/testUtils/gameManager";
import Phaser from "phaser";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ShopCursorTarget } from "#app/enums/shop-cursor-target";
import { UiMode } from "#enums/ui-mode";
import type ModifierSelectUiHandler from "#app/ui/modifier-select-ui-handler";
import { Button } from "#app/enums/buttons";
import { TrainerItemId } from "#enums/trainer-item-id";

describe("Items - Double Battle Chance Boosters", () => {
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
  });

  it("should guarantee double battle with 2 unique tiers", async () => {
    game.override
      .startingTrainerItems([{ entry: TrainerItemId.LURE }, { entry: TrainerItemId.SUPER_LURE }])
      .startingWave(2);

    await game.classicMode.startBattle();

    expect(game.scene.getEnemyField().length).toBe(2);
  });

  it("should guarantee double boss battle with 3 unique tiers", async () => {
    game.override
      .startingTrainerItems([
        { entry: TrainerItemId.LURE },
        { entry: TrainerItemId.SUPER_LURE },
        { entry: TrainerItemId.MAX_LURE },
      ])
      .startingWave(10);

    await game.classicMode.startBattle();

    const enemyField = game.scene.getEnemyField();

    expect(enemyField.length).toBe(2);
    expect(enemyField[0].isBoss()).toBe(true);
    expect(enemyField[1].isBoss()).toBe(true);
  });

  it("should renew how many battles are left of existing booster when picking up new booster of same tier", async () => {
    game.override
      .startingTrainerItems([{ entry: TrainerItemId.LURE }])
      .itemRewards([{ name: "LURE" }])
      .moveset(MoveId.SPLASH)
      .startingLevel(200);

    await game.classicMode.startBattle([SpeciesId.PIKACHU]);

    game.move.select(MoveId.SPLASH);

    await game.doKillOpponents();

    await game.phaseInterceptor.to("BattleEndPhase");

    const stack = game.scene.trainerItems.getStack(TrainerItemId.LURE);
    expect(stack).toBe(9);

    // Forced LURE to spawn in the first slot with override
    game.onNextPrompt(
      "SelectModifierPhase",
      UiMode.MODIFIER_SELECT,
      () => {
        const handler = game.scene.ui.getHandler() as ModifierSelectUiHandler;
        // Traverse to first modifier slot
        handler.setCursor(0);
        handler.setRowCursor(ShopCursorTarget.REWARDS);
        handler.processInput(Button.ACTION);
      },
      () => game.isCurrentPhase("CommandPhase") || game.isCurrentPhase("NewBattlePhase"),
      true,
    );

    await game.phaseInterceptor.to("TurnInitPhase");

    // Making sure only one booster is in the modifier list even after picking up another
    const newStack = game.scene.trainerItems.getStack(TrainerItemId.LURE);
    expect(newStack).toBe(10);
  });
});
