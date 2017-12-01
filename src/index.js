import Grapnel from 'grapnel'
import loadPolyfills from './util/polyfill'
import getSource from './app/sources'
import PuzzlePresenter from './components/puzzle'
import './index.scss'

function main() {
  const puzzlePresenter = new PuzzlePresenter({
    el: '#puzzle',
    clues: 'horizontal',
  })
  puzzlePresenter.hide()

  // Puzzle loading functions
  function loadPuzzle(opts) {
    puzzlePresenter.loadPuzzle(opts).then(p => {
      puzzlePresenter.show()
      document.title = p.meta.title || 'Crossword Demo'
    })
  }

  function loadPuzzleFromSource(source, year, month, day) {
    const src = getSource(source)
    const url = src.getUrl(year, month, day)
    if (url) {
      loadPuzzle({type: src.type, url: url})
    } else {
      throw new Error(`No puzzle for date: ${year}-${month}-${day}`)
    }
  }

  // Router
  const router = new Grapnel()

  router.get(/puzzle-url\/([^/]+)\/(\w+:\/+.*)/, req => {
    loadPuzzle({type: req.params[0], url: req.params[1]})
  })

  router.get('puzzle/:source/:year/:month/:day', req => {
    const p = req.params
    loadPuzzleFromSource(p.source, p.year, p.month, p.day)
  })

  router.get('puzzle/:source/current', req => {
    const p = req.params
    loadPuzzleFromSource(p.source)
  })

  // Default puzzle
  router.get('', req => router.navigate('puzzle/jonesin/current'))
}

loadPolyfills([
  'fetch' in window || 'fetch',
  'Promise' in window || 'Promise',
  'assign' in Object || 'Object.assign',
  'keys' in Object || 'Object.keys',
], main)
