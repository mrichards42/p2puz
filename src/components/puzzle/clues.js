import $ from 'jquery'
import Base from 'components/base'
import settings from './settings'
import './clues.scss'

const TEMPLATE = `
  <div class="clue-list-wrapper">
    <div class="clue-header" />
    <ul class="clue-list" />
  </div>
`

/** A single clues list */
export class ClueListView extends Base.View {
  constructor({template = TEMPLATE, ...opts} = {}) {
    super({template, ...opts})
    this.$header = this.$('.clue-header')
    this.$list = this.$('.clue-list')
  }

  // Layouts
  setLayout(layout) {
    this.setExclusiveClass('clues', layout)
  }

  // Drawing
  renderClueList(orientation, clues) {
    this.$el.data('orientation', orientation)
    this.setExclusiveClass('clue', orientation)
    this.$header.text(orientation)
    this.$list.empty()
    this.$list.append(clues.map(clue => `
      <li class="clue" data-idx=${clue.idx}>
        <span class="clue-number">${clue.number}</span>
        <span class="clue-text">${clue.text}</span>
      </li>
    `))
    const maxClue = clues[clues.length - 1].number
    this.$el.toggleClass('clues-3digit', maxClue >= 100)
    this.$('li.clue').click(e => {
      return this.presenter.onClueClick($(e.currentTarget).data('idx'))
    })
  }

  renderHighlight(clue, isPrimary) {
    // Clear the highlight
    this.$el.removeClass('highlight-primary highlight-secondary')
    this.$el.find('.highlight').removeClass('highlight')
    // Add the new highlight
    if (clue) {
      this.$el.addClass(isPrimary ? 'highlight-primary' : 'highlight-secondary')
      this.highlightClue(clue, 'highlight')
    }
  }

  highlightClue(clue, cssClass) {
    this.$list.children('li').eq(clue.idx).addClass(cssClass)
  }

  // Events
  onClueClick(handler) {
  }

  scrollTo(clue) {
    if (this.hasExclusiveClass('clues', 'tiny')) return
    const $list = this.$list
    $list.stop()
    // Make this a timeout (not a throttle or anything)
    clearTimeout(this._scrollTimeout)
    this._scrollTimeout = setTimeout(() => {
      const $clue = $list.find('li').eq(clue.idx)

      // Gather dimensions
      // Using jquery here is actually very slow
      const clueHt = $clue.height()
      const clueTop = $clue.offset().top
      const clueBot = clueTop + clueHt
      const listTop = $list.offset().top
      const listBot = listTop + $list.height()

      const padding = clueHt * settings['cluelist.scroll.buffer']

      // Figure out new scroll position
      let offset = 0
      switch (settings['cluelist.scroll.anchor']) {
        case 'middle':
          if (clueTop < (listTop + padding) || clueBot > (listBot - padding)) {
            offset = (clueTop + clueBot) / 2 - (listTop + listBot) / 2
          }
          break
        case 'top':
        default:
          if (clueTop < listTop || clueBot > (listBot - 2 * padding)) {
            offset = clueTop - listTop
          }
      }
      if (offset) {
        $list.animate({scrollTop: offset + $list.scrollTop()})
      }
    }, 0)
  }
}

const DEFAULT_LAYOUT = 'vertical'

export default class ClueListPresenter extends Base.Presenter {
  constructor({
    view = new ClueListView(),
    config = {},
    orientation,
    ...opts
  } = {}) {
    super({view, ...opts})
    this.orientation = orientation
    this.setLayout(DEFAULT_LAYOUT)
    this.puzzle = null
  }

  setLayout(layout) {
    this.view.setLayout(layout)
  }

  setPuzzle(puzzle) {
    this.puzzle = puzzle
    this.view.renderClueList(this.orientation, puzzle.clues[this.orientation])
    // Register puzzle events
    this.puzzle.on('cursor', square => {
      const clue = square.clues[this.orientation]
      const isPrimary = this.orientation === this.puzzle.currentOrientation
      this.view.renderHighlight(clue, isPrimary)
      this.view.scrollTo(clue)
    })
  }

  onClueClick(idx) {
    this.puzzle.moveCursor(
      this.puzzle.clues[this.orientation][idx].square,
      this.orientation
    )
    return false
  }
}
