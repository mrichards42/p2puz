/**
 * nyt json format
 * @module puzzle/format/json
 */
import Puzzle from '..'
import fetchProxy from 'SRC/util/fetch'

/**
 * Puzzle JSON format
 * @typedef {Object} Data
 * @property {Object} size
 * @property {number} size.rows - number of rows in the grid
 * @property {number} size.cols - number of cols in the grid
 * @property {string[]} grid - solution grid
 * @property {number[]} gridnums - numbers in the grid
 * @property {object} clues
 * @property {string[]} clues.across - across clues
 * @property {string[]} clues.down - down clues
 */

/**
 * Loads a JSON puzzle
 * @param {module:puzzle/format/json~Data} data - json puzzle
 * @returns {Puzzle}
 */
function load(data) {
  const puzzle = new Puzzle(data.size.rows, data.size.cols)
  // Grid data
  for (let i = 0; i < puzzle.size; ++i) {
    const square = puzzle.squares[i]
    square.solution = data.grid[i]
    square.number = data.gridnums[i]
    if (data.circles && data.circles[i]) {
      square.shapebg = 'circle'
    }
  }
  // Clues
  for (const orientation in data.clues) {
    for (const text of data.clues[orientation]) {
      const [, number, clue] = /^(\d+)\.\s(.*)/.exec(text)
      puzzle.addClue(number, orientation, clue)
    }
  }
  // Metadata
  puzzle.meta.title = data.title
  puzzle.meta.author = data.author
  puzzle.meta.editor = data.editor
  puzzle.meta.date = data.date
  puzzle.meta.copyright = data.copyright
  return puzzle
}

/**
 * Serializes a puzzle to JSON format
 * @returns {module:puzzle/format/json~Data}
 */
function save(puzzle) {
  const data = {
    size: {
      rows: puzzle.rows,
      cols: puzzle.cols,
    },
    grid:     puzzle.squares.map(s => s.solution),
    gridnums: puzzle.squares.map(s => s.number),
    circles:  puzzle.squares.map(s => s.shapebg === 'circle' ? 1 : 0),
    clues: {},
    title: puzzle.meta.title,
    author: puzzle.meta.author,
    editor: puzzle.meta.editor,
    date: puzzle.meta.date,
    copyright: puzzle.meta.copyright,
  }
  for (const orientation in puzzle.clues) {
    data.clues[orientation] =
        puzzle.clues[orientation].map(c => `${c.number}. ${c.text}`)
  }
  return data
}

export default {load, save, fetch: fetchProxy}
