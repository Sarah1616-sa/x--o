/* Board — the 3x3 cream sticker grid. X = red, O = gold. Repainted on render(). */
import { h } from '../dom.js'

export function Board(onCellClick) {
  const cells = []
  for (let i = 0; i < 9; i += 1) {
    cells.push(h('button', { class: 'cell', type: 'button', onClick: () => onCellClick(i) }))
  }
  const el = h('div', { class: 'board', role: 'grid' }, ...cells)

  function render({ board, winLine = null, targets = new Set(), protectedSet = new Set(), trapSet = new Set() } = {}) {
    const flat = Array.isArray(board[0]) ? board.flat() : board
    cells.forEach((cell, i) => {
      const v = flat[i]
      cell.className = 'cell'
      cell.textContent = ''
      if (v === 'X') { cell.classList.add('is-x'); cell.textContent = 'X' }
      else if (v === 'O') { cell.classList.add('is-o'); cell.textContent = 'O' }
      if (winLine && winLine.includes(i)) cell.classList.add('is-win')
      if (targets.has(i)) cell.classList.add('is-target')
      if (protectedSet.has && protectedSet.has(i)) {
        cell.append(h('span', { class: 'cell__mark cell__mark--shield' }))
      }
      // Only the trap's owner receives these indices (server hides them from the enemy).
      if (trapSet.has && trapSet.has(i)) {
        cell.append(h('span', { class: 'cell__mark cell__mark--trap' }))
      }
    })
  }

  return { el, cells, render }
}
