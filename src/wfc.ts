import { Chance } from "chance";
import { Assets } from "@peasy-lib/peasy-assets";

const chance = new Chance();

export type Rule = {
  up: number[];
  left: number[];
  right: number[];
  down: number[];
};
export type RuleType = Rule[];
export type TileObject = {
  id: number;
  entropy: number;
  availableTiles: number[];
};

export class WFC {
  worldCells: TileObject[] = [];
  currentTile: number;
  lastTile: number = 0;

  constructor(
    public mapwidth: number,
    public mapheight: number,
    public numTiles: number,
    public rules: RuleType,
    public context: CanvasRenderingContext2D,
    // public entContext: CanvasRenderingContext2D,
    public tilesize: number,
    public imageSource: HTMLImageElement,
    public drawdelay: number
  ) {
    //this.worldCells = new Array(mapheight * mapwidth).fill({ id: -1, entropy: numTiles, availableTiles: [] });
    for (let index = 0; index < this.mapwidth * this.mapheight; index++)
      this.worldCells.push({ id: -1, entropy: numTiles, availableTiles: [] });

    this.currentTile = chance.integer({ min: 0, max: this.worldCells.length });
  }

  delay = (howlong: number) => {
    return new Promise(res => setTimeout(res, howlong));
  };

  startWFC = async (startingTile?: number) => {
    let tileType;

    //based on tile rules passed, pick a legit tile
    const viableTiles = this.getIndexesWithValues(this.rules);
    if (startingTile == undefined) tileType = chance.pickone(viableTiles);
    else tileType = startingTile;

    //setting up do/while loop test
    let numTileswithNonZeroEntropy = this.numTiles;

    do {
      let dTileX;
      let dTileY;

      this.worldCells[this.currentTile].id = tileType;
      this.worldCells[this.currentTile].entropy = 0;
      this.worldCells[this.currentTile].availableTiles = [];

      //draw current tile to context
      const tileNumber = tileType;
      const sTileX = tileNumber % 9;
      const sTileY = Math.floor(tileNumber / 9);
      dTileX = this.currentTile % this.mapwidth;
      dTileY = Math.floor(this.currentTile / this.mapwidth);
      this.context.drawImage(this.imageSource, sTileX * 16, sTileY * 16, 16, 16, dTileX * 16, dTileY * 16, 16, 16);

      //calculate indexes of neighbors
      let upTileIndex, rightTileIndex, leftTileIndex, downTileIndex;
      this.currentTile - this.mapwidth < 0 ? (upTileIndex = -1) : (upTileIndex = this.currentTile - this.mapwidth);
      this.currentTile + this.mapwidth > this.worldCells.length - 1
        ? (downTileIndex = -1)
        : (downTileIndex = this.currentTile + this.mapwidth);
      this.currentTile % this.mapwidth == this.mapwidth - 1 ? (rightTileIndex = -1) : (rightTileIndex = this.currentTile + 1);
      this.currentTile % this.mapwidth == 0 ? (leftTileIndex = -1) : (leftTileIndex = this.currentTile - 1);

      let leftTileEntropy: number = this.numTiles,
        upTileEntropy: number = this.numTiles,
        rightTileEntropy: number = this.numTiles,
        downTileEntropy: number = this.numTiles;

      //setting entropies of neighbors
      if (upTileIndex != -1) upTileEntropy = this.getEntropy(upTileIndex);
      if (downTileIndex != -1) downTileEntropy = this.getEntropy(downTileIndex);
      if (leftTileIndex != -1) leftTileEntropy = this.getEntropy(leftTileIndex);
      if (rightTileIndex != -1) rightTileEntropy = this.getEntropy(rightTileIndex);

      if (leftTileIndex != -1 && this.worldCells[leftTileIndex].id == -1 && leftTileIndex != this.currentTile) {
        this.worldCells[leftTileIndex].entropy = leftTileEntropy;
      }
      if (rightTileIndex != -1 && this.worldCells[rightTileIndex].id == -1 && rightTileIndex != this.currentTile) {
        this.worldCells[rightTileIndex].entropy = rightTileEntropy;
      }
      if (upTileIndex != -1 && this.worldCells[upTileIndex].id == -1 && upTileIndex != this.currentTile) {
        this.worldCells[upTileIndex].entropy = upTileEntropy;
      }
      if (downTileIndex != -1 && this.worldCells[downTileIndex].id == -1 && downTileIndex != this.currentTile) {
        this.worldCells[downTileIndex].entropy = downTileEntropy;
      }

      // Create an array of objects with indexes
      const arrayWithIndexes = this.worldCells.map((element, index) => ({ index, entropy: element.entropy }));
      // Filter the array to get objects with non-zero entropy and find the minimum
      const filteredArray = arrayWithIndexes.filter(element => element.entropy > 0);
      const minEntropy = Math.min(...filteredArray.map(element => element.entropy));

      // Find objects with the minimum non-zero entropy and their original indexes
      const lowestEntropyObjects = filteredArray.filter(element => element.entropy === minEntropy);

      if (lowestEntropyObjects.length == 0) break;
      let randomIndex = chance.integer({ min: 0, max: lowestEntropyObjects.length - 1 });
      this.currentTile = lowestEntropyObjects[randomIndex].index;

      tileType = chance.pickone(this.worldCells[this.currentTile].availableTiles);

      //count elements with entropy = 0
      numTileswithNonZeroEntropy = this.worldCells.reduce((count, element) => {
        if (element.entropy != 0) {
          return count + 1;
        }
        return count;
      }, 0);

      //draw the 'target' around next tile
      dTileX = this.currentTile % this.mapwidth;
      dTileY = Math.floor(this.currentTile / this.mapwidth);
      this.context.drawImage(Assets.image("testwhite"), 0, 0, 16, 16, dTileX * 16, dTileY * 16, 16, 16);

      if (this.drawdelay) this.delay(this.drawdelay);
    } while (numTileswithNonZeroEntropy > 0);
  };

  getEntropy = (index: number): number => {
    //get indexes that have 0 entropy around index
    //calculate indexes of neighbors

    if (this.worldCells[index].entropy == 0) return 0;
    let upTileIndex, rightTileIndex, leftTileIndex, downTileIndex;
    index - this.mapwidth < 0 ? (upTileIndex = -1) : (upTileIndex = index - this.mapwidth);
    index + this.mapwidth > this.worldCells.length - 1 ? (downTileIndex = -1) : (downTileIndex = index + this.mapwidth);
    index % this.mapwidth == this.mapwidth - 1 ? (rightTileIndex = -1) : (rightTileIndex = index + 1);
    index % this.mapwidth == 0 ? (leftTileIndex = -1) : (leftTileIndex = index - 1);

    let upTileAvailableTiles: any[] = [];
    let downTileAvailableTiles: any[] = [];
    let leftTileAvailableTiles: any[] = [];
    let rightTileAvailableTiles: any[] = [];

    if (upTileIndex != -1 && this.worldCells[upTileIndex].entropy == 0) {
      let uptiletype = this.worldCells[upTileIndex].id;
      upTileAvailableTiles = [...this.rules[uptiletype].down];
    }
    if (downTileIndex != -1 && this.worldCells[downTileIndex].entropy == 0) {
      let downTileType = this.worldCells[downTileIndex].id;
      downTileAvailableTiles = [...this.rules[downTileType].up];
    }
    if (leftTileIndex != -1 && this.worldCells[leftTileIndex].entropy == 0) {
      let leftTileType = this.worldCells[leftTileIndex].id;
      leftTileAvailableTiles = [...this.rules[leftTileType].right];
    }
    if (rightTileIndex != -1 && this.worldCells[rightTileIndex].entropy == 0) {
      let rightTileType = this.worldCells[rightTileIndex].id;
      rightTileAvailableTiles = [...this.rules[rightTileType].left];
    }

    let testArray = [];
    if (upTileAvailableTiles.length) testArray.push(upTileAvailableTiles);
    if (downTileAvailableTiles.length) testArray.push(downTileAvailableTiles);
    if (leftTileAvailableTiles.length) testArray.push(leftTileAvailableTiles);
    if (rightTileAvailableTiles.length) testArray.push(rightTileAvailableTiles);

    if (testArray.length == 0) {
      this.resetAndStartOver();
    }

    const consolodatedArray = testArray.reduce((sum, arr) => sum.filter((x: any) => arr.includes(x)), testArray[0]);

    if (consolodatedArray.length == 0) {
      this.resetAndStartOver();
    }

    this.worldCells[index].availableTiles = [...consolodatedArray];
    return this.worldCells[index].availableTiles.length;
  };

  getIndexesWithValues = (myArray: any[]) => {
    const indexesWithValues = [];
    for (let i = 0; i < myArray.length; i++) {
      if (myArray[i] !== undefined && myArray[i] !== null) {
        indexesWithValues.push(i);
      }
    }
    return indexesWithValues;
  };

  resetAndStartOver = () => {
    //clear canvas
    this.context.clearRect(0, 0, this.mapwidth, this.mapheight);

    //reset worldcells
    this.worldCells = [];
    for (let index = 0; index < this.mapwidth * this.mapheight; index++)
      this.worldCells.push({ id: -1, entropy: this.numTiles, availableTiles: [] });

    this.currentTile = chance.integer({ min: 0, max: this.worldCells.length });
    //pick new starting point
    this.startWFC();
  };
}
