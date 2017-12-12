import settings from 'app/settings'

export default settings.set({
  grid: {
    movement: {
      newClue: 'blank', // Where to move on a new clue: 'start' | 'blank' | null
      pauseBeforeSwitch: true, // Pause before switch what arrow keys
      afterLetter: 'next', // Move after entering a letter: 'next' | 'blank'
    },
    keys: {
      space: 'erase', // What to do with space key: 'erase' | 'orientation'
    },
  },
  cluelist: {
    scroll: {
      anchor: 'middle', // Clue anchor relative to the list: 'middle' | 'top'
      buffer: 5, // Scroll once item is this many clues away from the anchor
    },
  },
  remote: {
    letter: {
      overwrite: true, // Remote entry overwrites the local grid
    },
  },
})
