/**
 * AcrossLite puz format
 * @module puzzle/format/puz
 */
import StringDataView from 'util/stringdataview'
import fetchProxy from 'util/fetch'
import Puzzle from '..'

const MAGIC = 'ACROSS&DOWN\0'

/**
 * Loads a puzzle.
 * @param {ArrayBuffer} data
 * @returns {Puzzle}
 */
function load(data) {
  const dv = StringDataView(data)
  if (dv.getString8(0x02, 0x0C) !== MAGIC) throw new Error('Not a puz file')
  // [... skip the checksums ...]
  const width = dv.getUint8(0x2C)
  const height = dv.getUint8(0x2D)
  const gridSize = width * height
  const clueCount = dv.getUint16(0x2E, true)
  // [... skip more checksums ...]
  // Grid
  const puzzle = new Puzzle(height, width)
  let pos = 0x34
  const solution = dv.getString8(pos, gridSize); pos += gridSize
  const userText = dv.getString8(pos, gridSize); pos += gridSize
  for (let i = 0; i < gridSize; ++i) {
    puzzle.squares[i].solution = solution[i]
    puzzle.squares[i].letter = userText[i] === '-' ? '' : userText[i]
  }
  // Metadata
  const title = dv.getDelimitedString8(pos, 0); pos += title.length + 1
  const author = dv.getDelimitedString8(pos, 0); pos += author.length + 1
  const copyright = dv.getDelimitedString8(pos, 0); pos += copyright.length + 1
  puzzle.meta.title = title
  puzzle.meta.author = author
  puzzle.meta.copyright = copyright
  // Clues
  const clues = []
  for (let i = 0; i < clueCount; ++i) {
    const clue = dv.getDelimitedString8(pos, 0); pos += clue.length + 1
    clues.push(clue)
  }
  // Notes
  const notes = dv.getDelimitedString8(pos, 0); pos += notes.length + 1
  puzzle.meta.notes = notes
  // Extra sections
  while (pos + 8 < dv.byteLength) { // header is 8 bytes
    const section = dv.getString8(pos, 4); pos += section.length
    const length = dv.getUint16(pos, true)
    pos += 4 // skip length and checksum
    loadSection(section, puzzle, StringDataView(data, pos, length))
    pos += length + 1 // extra null
  }
  // Assign numbers
  let number = 1
  let clueIdx = 0
  for (const square of puzzle.squares) {
    if (square.isStart('across')) {
      puzzle.addClue(number, 'across', clues[clueIdx++])
      square.number = number
    }
    if (square.isStart('down')) {
      puzzle.addClue(number, 'down', clues[clueIdx++])
      square.number = number
    }
    if (square.number) ++number
  }
  return puzzle
}

const SECTIONS = {
  // Circles and other flags; one per square
  GEXT: {
    load: (puzzle, dv) => {
      for (const square of puzzle.squares) {
        const flag = dv.getUint8(square.idx)
        if (flag & 0x80) square.shapebg = 'circle'
      }
    },
  },
  // Timer
  LTIM: {
    load: (puzzle, dv) => {
      const [time, isRunning] = dv.getString8(0).split(',')
      puzzle.state.time = +time
      puzzle.state.timerIsRunning = !!isRunning
    },
  },
}

function loadSection(name, puzzle, dv) {
  const defn = SECTIONS[name]
  if (defn && defn.load) defn.load(puzzle, dv)
}

function fetch(url) {
  return fetchProxy(url).then(r => r.arrayBuffer())
}

export default {load, fetch}
