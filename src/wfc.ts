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
    public entContext: CanvasRenderingContext2D,
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
    let firstime = true;

    //setting up entropy font
    this.entContext.font = "9px Arial";
    this.entContext.fillStyle = "orange";
    this.entContext.textAlign = "center";

    //based on tile rules passed, pick a legit tile
    const viableTiles = this.getIndexesWithValues(this.rules);
    if (startingTile == undefined) tileType = chance.pickone(viableTiles);
    else tileType = startingTile;

    //setting up do/while loop test
    let numTileswithNonZeroEntropy = this.numTiles;
    console.log("starting tile type ", tileType);
    console.log("starting index: ", this.currentTile);

    do {
      if (!firstime) console.clear();
      firstime = false;
      console.info("TOP OF LOOP");

      //draw entropies on canvas
      this.entContext.clearRect(0, 0, 160, 160);

      let dTileX;
      let dTileY;
      this.worldCells.forEach((cell: any, index: number) => {
        dTileX = index % this.mapwidth;
        dTileY = Math.floor(index / this.mapwidth);

        this.entContext.fillText(`${cell.entropy}`, dTileX * 16 + 8, dTileY * 16 + 12);
      });

      //set current tile
      console.log(tileType);

      this.worldCells[this.currentTile].id = tileType;
      this.worldCells[this.currentTile].entropy = 0;
      this.worldCells[this.currentTile];

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

      if (leftTileIndex && leftTileIndex != -1 && this.worldCells[leftTileIndex].id == -1) {
        this.worldCells[leftTileIndex].entropy = leftTileEntropy;
        this.worldCells[leftTileIndex].availableTiles = [...this.rules[tileType].left];
      }
      if (rightTileIndex != -1 && this.worldCells[rightTileIndex].id == -1) {
        this.worldCells[rightTileIndex].entropy = rightTileEntropy;
        this.worldCells[rightTileIndex].availableTiles = [...this.rules[tileType].right];
      }
      if (upTileIndex != -1 && this.worldCells[upTileIndex].id == -1) {
        this.worldCells[upTileIndex].entropy = upTileEntropy;
        this.worldCells[upTileIndex].availableTiles = [...this.rules[tileType].up];
      }
      if (downTileIndex != -1 && this.worldCells[downTileIndex].id == -1) {
        this.worldCells[downTileIndex].entropy = downTileEntropy;
        this.worldCells[downTileIndex].availableTiles = [...this.rules[tileType].down];
      }

      if (upTileIndex != -1)
        console.log("up avail: ", this.worldCells[upTileIndex].entropy, this.worldCells[upTileIndex].availableTiles);
      if (downTileIndex != -1)
        console.log("down avail: ", this.worldCells[downTileIndex].entropy, this.worldCells[downTileIndex].availableTiles);
      if (leftTileIndex != -1)
        console.log("left avail: ", this.worldCells[leftTileIndex].entropy, this.worldCells[leftTileIndex].availableTiles);
      if (rightTileIndex != -1)
        console.log("right avail: ", this.worldCells[rightTileIndex].entropy, this.worldCells[rightTileIndex].availableTiles);

      // Create an array of objects with indexes
      const arrayWithIndexes = this.worldCells.map((element, index) => ({ index, entropy: element.entropy }));
      // Filter the array to get objects with non-zero entropy and find the minimum
      const filteredArray = arrayWithIndexes.filter(element => element.entropy > 0);
      const minEntropy = Math.min(...filteredArray.map(element => element.entropy));

      // Find objects with the minimum non-zero entropy and their original indexes
      const lowestEntropyObjects = filteredArray.filter(element => element.entropy === minEntropy);
      //console.log("array of indexes with lowest entropy", lowestEntropyObjects);
      let randomIndex = chance.integer({ min: 0, max: lowestEntropyObjects.length - 1 });
      this.currentTile = lowestEntropyObjects[randomIndex].index;
      console.log(
        `next tile: index: ${this.currentTile}, ent: ${this.worldCells[this.currentTile].entropy}, and avaialble tiles to choose `
      );
      console.log(this.worldCells[this.currentTile].availableTiles);

      tileType = chance.pickone(this.worldCells[this.currentTile].availableTiles);
      console.log("chosen type: ", tileType);

      //count elements with entropy = 0
      numTileswithNonZeroEntropy = this.worldCells.reduce((count, element) => {
        if (element.entropy != 0) {
          return count + 1;
        }
        return count;
      }, 0);
      console.log("remaining cells to collapse", numTileswithNonZeroEntropy);

      //draw the 'target' around next tile
      dTileX = this.currentTile % this.mapwidth;
      dTileY = Math.floor(this.currentTile / this.mapwidth);
      this.context.drawImage(Assets.image("testwhite"), 0, 0, 16, 16, dTileX * 16, dTileY * 16, 16, 16);

      //draw entropies on canvas
      this.entContext.clearRect(0, 0, 160, 160);
      this.entContext.font = "9px Arial";
      this.entContext.fillStyle = "orange";
      this.entContext.textAlign = "center";

      this.worldCells.forEach((cell: any, index: number) => {
        dTileX = index % this.mapwidth;
        dTileY = Math.floor(index / this.mapwidth);
        this.entContext.fillText(`${cell.entropy}`, dTileX * 16 + 8, dTileY * 16 + 12);
      });
    } while (numTileswithNonZeroEntropy > 0);
  };

  getEntropy = (index: number): number => {
    //get indexes that have 0 entropy around index
    //calculate indexes of neighbors
    //console.log("entropy, check index: ", index);

    if (this.worldCells[index].entropy == 0) return 0;
    let upTileIndex, rightTileIndex, leftTileIndex, downTileIndex;
    index - this.mapwidth < 0 ? (upTileIndex = -1) : (upTileIndex = index - this.mapwidth);
    index + this.mapwidth > this.worldCells.length - 1 ? (downTileIndex = -1) : (downTileIndex = index + this.mapwidth);
    index % this.mapwidth == this.mapwidth - 1 ? (rightTileIndex = -1) : (rightTileIndex = index + 1);
    index % this.mapwidth == 0 ? (leftTileIndex = -1) : (leftTileIndex = index - 1);
    //console.log("in get Entropy: neighbors", upTileIndex, downTileIndex, leftTileIndex, rightTileIndex);

    let upTileAvailableTiles: any[] = [];
    let downTileAvailableTiles: any[] = [];
    let leftTileAvailableTiles: any[] = [];
    let rightTileAvailableTiles: any[] = [];

    if (upTileIndex != -1 && this.worldCells[upTileIndex].entropy == 0) {
      let uptiletype = this.worldCells[upTileIndex].id;
      upTileAvailableTiles = [...this.rules[uptiletype].down];

      //console.log("Echecking up: ", upTileIndex, " and available tiles are: ", upTileAvailableTiles);
    }
    if (downTileIndex != -1 && this.worldCells[downTileIndex].entropy == 0) {
      let downTileType = this.worldCells[downTileIndex].id;
      downTileAvailableTiles = [...this.rules[downTileType].up];
      //console.log("Echecking down: ", downTileIndex, " and available tiles are: ", downTileAvailableTiles);
    }
    if (leftTileIndex != -1 && this.worldCells[leftTileIndex].entropy == 0) {
      let leftTileType = this.worldCells[leftTileIndex].id;
      leftTileAvailableTiles = [...this.rules[leftTileType].right];
      //console.log("Echecking left: ", leftTileIndex, " and available tiles are: ", leftTileAvailableTiles);
    }
    if (rightTileIndex != -1 && this.worldCells[rightTileIndex].entropy == 0) {
      let rightTileType = this.worldCells[rightTileIndex].id;
      rightTileAvailableTiles = [...this.rules[rightTileType].left];
      //console.log("Echecking right: ", rightTileIndex, " and available tiles are: ", rightTileAvailableTiles);
    }

    if (
      upTileAvailableTiles.length == 0 &&
      downTileAvailableTiles.length == 0 &&
      leftTileAvailableTiles.length == 0 &&
      rightTileAvailableTiles.length == 0
    ) {
      // console.log("");
    }

    let testArray = [];
    if (upTileAvailableTiles.length) testArray.push(upTileAvailableTiles);
    if (downTileAvailableTiles.length) testArray.push(downTileAvailableTiles);
    if (leftTileAvailableTiles.length) testArray.push(leftTileAvailableTiles);
    if (rightTileAvailableTiles.length) testArray.push(rightTileAvailableTiles);

    if (testArray.length > 1) {
      //console.log(testArray);
    }

    if (testArray.length == 0) {
      // console.log("test array: ", testArray);
      throw new Error("no available tiles");
    }

    const consolodatedArray = testArray.reduce((sum, arr) => sum.filter((x: any) => arr.includes(x)), testArray[0]);
    //console.log("consolodated array: ", consolodatedArray);

    if (consolodatedArray.length == 0) {
      //console.info(upTileAvailableTiles, downTileAvailableTiles, leftTileAvailableTiles, rightTileAvailableTiles);
      //console.log(index);
      throw new Error("no available tiles");
    }

    this.worldCells[index].availableTiles = [...consolodatedArray];
    console.log(`Setting index ${index} of WCells to `, this.worldCells[index].availableTiles);
    console.log(`Returning entropy value of `, this.worldCells[index].availableTiles.length);
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
}
