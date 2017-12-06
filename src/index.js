import Grapnel from 'grapnel'
import loadPolyfills from './util/polyfill'
import getSource from './app/sources'
import PuzzlePeer from './app/peer'
import PuzzlePresenter from './components/puzzle'
import './index.scss'

function main() {
  // Setup presenter
  const puzzlePresenter = new PuzzlePresenter({
    el: '#puzzle',
    clues: 'horizontal',
  })
  puzzlePresenter.hide()

  // Setup peer
  const peer = new PuzzlePeer()
  peer.on('puzzle', showPuzzle)
  peer.on('puzzle-state', state => puzzlePresenter.setRemoteState(state))

  function joinRoom(roomId, userId) {
    puzzlePresenter.hide()
    peer.setPuzzle(null)
    peer.on('connect', () => {
      // Don't request a puzzle if we already have one.
      // If we joined a room and then the room's creator disconnected and
      // reconnected using /join-room *we* would already have the puzzle and
      // would need to send it to *them*.
      if (!peer.puzzle) peer.send('request-puzzle')
    })
    peer.connect(roomId, userId)
  }

  // Puzzle loading functions
  function showPuzzle(puzzle) {
    puzzlePresenter.setPuzzle(puzzle)
    puzzlePresenter.show()
    document.title = puzzle.meta.title || 'Crossword Demo'
    peer.setPuzzle(puzzle)
  }

  function loadPuzzle(opts) {
    puzzlePresenter.hide()
    puzzlePresenter.loadPuzzle(opts).then(showPuzzle)
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

  // Room joining route
  router.get('/join-room/:roomId', req => {
    const p = req.params
    const [room, user] = p.roomId.split('|')
    joinRoom(room, user)
  })

  // Room creation context
  function connectToRoom(req, event, next) {
    if (req.params.roomId) peer.connect(req.params.roomId)
    next()
  }
  const withRoom = router.context('/(create-room/:roomId)?', connectToRoom)

  // Puzzle routes
  withRoom('puzzle-url/:type/:url(*)', req => {
    loadPuzzle({type: req.params.type, url: req.params.url})
  })

  withRoom('puzzle/:source/:year/:month/:day', req => {
    const p = req.params
    loadPuzzleFromSource(p.source, p.year, p.month, p.day)
  })

  withRoom('puzzle/:source/current', req => {
    const p = req.params
    loadPuzzleFromSource(p.source)
  })

  withRoom('puzzle/:source/:offset(-?[0-9]{1,})', req => {
    const p = req.params
    const d = new Date()
    d.setDate(d.getDate() + parseInt(p.offset))
    loadPuzzleFromSource(p.source, d.getFullYear(), d.getMonth() + 1, d.getDate())
  })

  // Default puzzle
  router.get('', req => router.navigate('/puzzle/jonesin/current'))
}

loadPolyfills([
  'fetch' in window || 'fetch',
  'Promise' in window || 'Promise',
  'assign' in Object || 'Object.assign',
  'keys' in Object || 'Object.keys',
], main)
