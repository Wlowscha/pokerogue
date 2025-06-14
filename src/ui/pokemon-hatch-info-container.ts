import PokemonInfoContainer from "#app/ui/pokemon-info-container";
import { Gender } from "#app/data/gender";
import { PokemonType } from "#enums/pokemon-type";
import { rgbHexToRgba, padInt } from "#app/utils/common";
import { TextStyle, addTextObject } from "#app/ui/text";
import { speciesEggMoves } from "#app/data/balance/egg-moves";
import { allMoves } from "#app/data/data-lists";
import { SpeciesId } from "#enums/species-id";
import { getEggTierForSpecies } from "#app/data/egg";
import { starterColors } from "#app/global-vars/starter-colors";
import { globalScene } from "#app/global-scene";
import { argbFromRgba } from "@material/material-color-utilities";
import type { EggHatchData } from "#app/data/egg-hatch-data";
import type { PlayerPokemon } from "#app/field/pokemon";
import { getPokemonSpeciesForm } from "#app/data/pokemon-species";

/**
 * Class for the hatch info summary of each pokemon
 * Holds an info container as well as an additional egg sprite, name, egg moves and main sprite
 */
export default class PokemonHatchInfoContainer extends PokemonInfoContainer {
  private currentPokemonSprite: Phaser.GameObjects.Sprite;
  private pokemonNumberText: Phaser.GameObjects.Text;
  private pokemonNameText: Phaser.GameObjects.Text;
  private pokemonEggMovesContainer: Phaser.GameObjects.Container;
  private pokemonEggMoveContainers: Phaser.GameObjects.Container[];
  private pokemonEggMoveBgs: Phaser.GameObjects.NineSlice[];
  private pokemonEggMoveLabels: Phaser.GameObjects.Text[];
  private pokemonHatchedIcon: Phaser.GameObjects.Sprite;
  private pokemonListContainer: Phaser.GameObjects.Container;
  private pokemonCandyIcon: Phaser.GameObjects.Sprite;
  private pokemonCandyOverlayIcon: Phaser.GameObjects.Sprite;
  private pokemonCandyCountText: Phaser.GameObjects.Text;

  constructor(listContainer: Phaser.GameObjects.Container, x = 115, y = 9) {
    super(x, y);
    this.pokemonListContainer = listContainer;
  }
  setup(): void {
    super.setup();
    super.changeToEggSummaryLayout();

    this.currentPokemonSprite = globalScene.add.sprite(54, 80, "pkmn__sub");
    this.currentPokemonSprite.setScale(0.8);
    this.currentPokemonSprite.setPipeline(globalScene.spritePipeline, {
      tone: [0.0, 0.0, 0.0, 0.0],
      ignoreTimeTint: true,
    });
    this.pokemonListContainer.add(this.currentPokemonSprite);

    // setup name and number
    this.pokemonNumberText = addTextObject(80, 107.5, "0000", TextStyle.SUMMARY, { fontSize: 74 });
    this.pokemonNumberText.setOrigin(0, 0);
    this.pokemonListContainer.add(this.pokemonNumberText);

    this.pokemonNameText = addTextObject(7, 107.5, "", TextStyle.SUMMARY, {
      fontSize: 74,
    });
    this.pokemonNameText.setOrigin(0, 0);
    this.pokemonListContainer.add(this.pokemonNameText);

    // setup egg icon and candy count
    this.pokemonHatchedIcon = globalScene.add.sprite(-5, 90, "egg_icons");
    this.pokemonHatchedIcon.setOrigin(0, 0.2);
    this.pokemonHatchedIcon.setScale(0.8);
    this.pokemonListContainer.add(this.pokemonHatchedIcon);

    this.pokemonCandyIcon = globalScene.add.sprite(4.5, 40, "candy");
    this.pokemonCandyIcon.setScale(0.5);
    this.pokemonCandyIcon.setOrigin(0, 0);
    this.pokemonListContainer.add(this.pokemonCandyIcon);

    this.pokemonCandyOverlayIcon = globalScene.add.sprite(4.5, 40, "candy_overlay");
    this.pokemonCandyOverlayIcon.setScale(0.5);
    this.pokemonCandyOverlayIcon.setOrigin(0, 0);
    this.pokemonListContainer.add(this.pokemonCandyOverlayIcon);

    this.pokemonCandyCountText = addTextObject(14, 40, "x0", TextStyle.SUMMARY, { fontSize: "56px" });
    this.pokemonCandyCountText.setOrigin(0, 0);
    this.pokemonListContainer.add(this.pokemonCandyCountText);

    // setup egg moves
    this.pokemonEggMoveContainers = [];
    this.pokemonEggMoveBgs = [];
    this.pokemonEggMoveLabels = [];
    this.pokemonEggMovesContainer = globalScene.add.container(0, 200);
    this.pokemonEggMovesContainer.setVisible(false);
    this.pokemonEggMovesContainer.setScale(0.5);

    for (let m = 0; m < 4; m++) {
      const eggMoveContainer = globalScene.add.container(0, 0 + 6 * m);

      const eggMoveBg = globalScene.add.nineslice(70, 0, "type_bgs", "unknown", 92, 14, 2, 2, 2, 2);
      eggMoveBg.setOrigin(1, 0);

      const eggMoveLabel = addTextObject(70 - eggMoveBg.width / 2, 0, "???", TextStyle.PARTY);
      eggMoveLabel.setOrigin(0.5, 0);

      this.pokemonEggMoveBgs.push(eggMoveBg);
      this.pokemonEggMoveLabels.push(eggMoveLabel);

      eggMoveContainer.add(eggMoveBg);
      eggMoveContainer.add(eggMoveLabel);
      eggMoveContainer.setScale(0.44);

      this.pokemonEggMoveContainers.push(eggMoveContainer);

      this.pokemonEggMovesContainer.add(eggMoveContainer);
    }

    super.add(this.pokemonEggMoveContainers);
  }

  /**
   * Disable the sprite (and replace with substitute)
   */
  hideDisplayPokemon() {
    this.currentPokemonSprite.setVisible(false);
  }

  /**
   * Display a given pokemon sprite with animations
   * assumes the specific pokemon sprite has already been loaded
   */
  displayPokemon(pokemon: PlayerPokemon) {
    const species = pokemon.species;
    const female = pokemon.gender === Gender.FEMALE;
    const formIndex = pokemon.formIndex;
    const shiny = pokemon.shiny;
    const variant = pokemon.variant;
    this.currentPokemonSprite.setVisible(false);
    species.loadAssets(female, formIndex, shiny, variant, true).then(() => {
      getPokemonSpeciesForm(species.speciesId, pokemon.formIndex).cry();
      this.currentPokemonSprite.play(species.getSpriteKey(female, formIndex, shiny, variant));
      this.currentPokemonSprite.setPipelineData("shiny", shiny);
      this.currentPokemonSprite.setPipelineData("variant", variant);
      this.currentPokemonSprite.setPipelineData("spriteKey", species.getSpriteKey(female, formIndex, shiny, variant));
      this.currentPokemonSprite.setVisible(true);
    });
  }

  /**
   * Updates the info container with the appropriate dex data and starter entry from the hatchInfo
   * Also updates the displayed name, number, egg moves and main animated sprite for the pokemon
   * @param hatchInfo The EggHatchData of the pokemon / new hatch to show
   */
  showHatchInfo(hatchInfo: EggHatchData) {
    this.pokemonEggMovesContainer.setVisible(true);

    const pokemon = hatchInfo.pokemon;
    const species = pokemon.species;
    this.displayPokemon(pokemon);

    super.show(pokemon, false, 1, hatchInfo.getDex(), hatchInfo.getStarterEntry(), true);
    const colorScheme = starterColors[species.speciesId];

    this.pokemonCandyIcon.setTint(argbFromRgba(rgbHexToRgba(colorScheme[0])));
    this.pokemonCandyIcon.setVisible(true);
    this.pokemonCandyOverlayIcon.setTint(argbFromRgba(rgbHexToRgba(colorScheme[1])));
    this.pokemonCandyOverlayIcon.setVisible(true);
    this.pokemonCandyCountText.setText(`x${globalScene.gameData.starterData[species.speciesId].candyCount}`);
    this.pokemonCandyCountText.setVisible(true);

    this.pokemonNumberText.setText(padInt(species.speciesId, 4));
    this.pokemonNameText.setText(species.name);

    const hasEggMoves = species && speciesEggMoves.hasOwnProperty(species.speciesId);

    for (let em = 0; em < 4; em++) {
      const eggMove = hasEggMoves ? allMoves[speciesEggMoves[species.speciesId][em]] : null;
      const eggMoveUnlocked = eggMove && globalScene.gameData.starterData[species.speciesId].eggMoves & Math.pow(2, em);
      this.pokemonEggMoveBgs[em].setFrame(
        PokemonType[eggMove ? eggMove.type : PokemonType.UNKNOWN].toString().toLowerCase(),
      );

      this.pokemonEggMoveLabels[em].setText(eggMove && eggMoveUnlocked ? eggMove.name : "???");
      if (!(eggMove && hatchInfo.starterDataEntryBeforeUpdate.eggMoves & Math.pow(2, em)) && eggMoveUnlocked) {
        this.pokemonEggMoveLabels[em].setText("(+) " + eggMove.name);
      }
    }

    // will always have at least one egg move
    this.pokemonEggMovesContainer.setVisible(true);

    if (species.speciesId === SpeciesId.MANAPHY || species.speciesId === SpeciesId.PHIONE) {
      this.pokemonHatchedIcon.setFrame("manaphy");
    } else {
      this.pokemonHatchedIcon.setFrame(getEggTierForSpecies(species));
    }
  }
}
