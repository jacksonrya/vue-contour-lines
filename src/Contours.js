/* eslint-disable no-unused-vars */
import * as d3 from 'd3-contour'
import fill from 'lodash-es/fill.js'
import range from 'lodash-es/range.js'

export const THRESHOLD_OPTIONS = {
  EMPTY: 'empty',
  RANDOM: 'random',
}

// List of values that seperate contour buckets. The z-axis values at which contours lines are drawn.
const THRESHOLDS = {
  empty: { threshold: function () { return range(1, (this.bucketCount + 1) * this.zRange / this.bucketCount, CONTOUR_INTERVAL).reverse() } },
  random: { threshold: function () { return range(0, 100, 10) } },
}

const CONTOUR_INTERVAL = 20 // The 'vertical' distance between each contour line.

/**
 * Manages the creation of isoband contours.
 */
export class Contours {
  constructor (resolution, preset) {
    this.resolution = resolution

    this.min = Infinity
    this.max = -Infinity

    this.preset = preset

    this._matrix = undefined
    this._threshold = undefined
    this._init()
  }

  _init() {
    this._matrix = this._initMatrix()[this.preset]()
    this._threshold = THRESHOLDS[this.preset].threshold
  }

  static random (resolution) {
    return new this(resolution)
  }

  get matrix() {
    return this._matrix
  }

  set matrix(matrix) {
    // validate that the new matrix can replace the old
    this._matrix = matrix;
  }

  get matrixArea() {
    if (!this.resolution) return 0

    return this.resolution.cellCount
  }

  get zRange () {
    return Math.ceil(this.max - this.min)
  }

  // The number of sorting buckets to accomodate all z-axis values.
  get bucketCount () {
    return Math.ceil(this.max / CONTOUR_INTERVAL)
  }

  get isobands() {
    return this._getIsobands(this.matrix)
  }

  updateResolution(resolution) {
    this.resolution = resolution
    this._init()
  }

  resetMatrix() {

  }

  _getMatrixIndex (x, y) { // TODO move to matrix class
    return Math.floor((y * this.resolution.width) + x)
  }

  _addToMatrixValue (i, z) {
    this._matrix[i] += z
  }

  _getMatrixValue (i) {
    if (i < 0 || i > this.matrixArea) {
      return undefined
    }

    return this._matrix[i]
  }

  reset() {
    this._clearMatrix()
  }

  randomize() {
    this._randomizeMatrix()
  }

  raise ({ x, y }, zDelta = 100, density = 4) {
    // calculate distances to closest nodes
    const pos = this._getMatrixIndex(x, y)
    // this._matrix[pos] += zDelta
    this._addToMatrixValue(pos, zDelta)
    // TODO  raise values of neighbors at a fraction of zDelta
    // antialias with new values

    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i !== 0 || j !== 0) {
          this._addToMatrixValue(this._getMatrixIndex(x + i, y + j), zDelta / density)
        }
      }
    }

    this.antialias({ x, y })

    const z = this._matrix[pos]

    if (z < this.min) this.min = z
    if (z > this.max) this.max = z
  }

  // ?? This helps make fluid diagonals drawn, but doesn't spread the force effect
  antialias ({ x, y }, iterations = 0) {
    const ITERATION_CAP = 2
    if (!x || !y) return
    if (iterations === ITERATION_CAP) return
    if (x < 0 || y < 0 || x >= this.resolution.width || y >= this.resolution.height) return

    const neighborCoors = new Array(8)
    const neighborIndexes = new Array(8)

    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const coor = [ x + j, y + i ]
        neighborIndexes.push(this._getMatrixIndex(...coor))
        neighborCoors.push(...coor)
      }
    }

    const neighbors = neighborIndexes.map(i => {
      return this._getMatrixValue(i)
    })

    const currMatrixValue = this._getMatrixValue(this._getMatrixIndex(x, y))
    // console.log([currMatrixValue, ...neighbors])
    const newMatrixValue = [ currMatrixValue, ...neighbors ].reduce((prev, curr) => prev + curr) / 9
    // console.log(newMatrixValue)
    this._addToMatrixValue(this._getMatrixIndex(x, y), (newMatrixValue || 0)) // TODO: this is always returning 0 ? is newMatrixValue always invalid?

    // TODO: filter internal coordinates, only antialias the edge of the current range --- DON'T ANTIALIAS WHAT"S ALREADY BEEN ANTIALIASED
    neighborCoors.forEach(coor => {
      this.antialias(coor, iterations + 1)
    })
  }

  _getIsobands (matrix) {
    const n = this.resolution.width
    const m = this.resolution.height

    const contours = d3.contours()
      .size([ n, m ])
      .thresholds(this._threshold())

    return contours(matrix)
  }

  // https://stackoverflow.com/questions/25582882/javascript-math-random-normal-distribution-gaussian-bell-curve
  _randomBm () {
    let u = 0; let v = 0
    while (u === 0) u = Math.random() // Converting [0,1) to (0,1)
    while (v === 0) v = Math.random()
    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
    num = num / 10.0 + 0.5 // Translate to 0 -> 1
    if (num > 1 || num < 0) return this._randomBm() // resample between 0 and 1
    return num
  }

  _clearMatrix() {
    this.matrix = fill(new Array(this.matrixArea), 10)
  }

  _randomizeMatrix() {
    const values = fill(new Array(this.matrixArea), 10) // TODO reduce redundancy with clearmatrix

    let curr = 0

    for (let x = 0; x < this.resolution.width; x++) {
      for (let y = 0; y < this.resolution.height; y++) {
        const z = [
          0,
          Math.random() * 100,
          (x * 10) + y,
          this._randomBm() * 100,
        ][3]

        if (z < this.min) this.min = z
        if (z > this.max) this.max = z

        // values[x * 10 + y] = z
        values[curr] = z
        curr++
      }
    }

    this.matrix = values
  }

  _initMatrix () {
    const initValues = () => {
      return fill(new Array(this.matrixArea), 10) // TODO init should be to 0, but might have an edge-case bug, so testing w 10 :)
    }

    const matrices = {
      gradient: () => {
        return range(0, this.matrixArea)
      },
      random: () => {
        const values = initValues()

        let curr = 0

        for (let x = 0; x < this.resolution.width; x++) {
          for (let y = 0; y < this.resolution.height; y++) {
            const z = [
              0,
              Math.random() * 100,
              (x * 10) + y,
              this._randomBm() * 100,
            ][3]

            if (z < this.min) this.min = z
            if (z > this.max) this.max = z

            // values[x * 10 + y] = z
            values[curr] = z
            curr++
          }
        }

        return values
      },
    }

    matrices.empty = initValues // initValues

    return matrices
  }
}
