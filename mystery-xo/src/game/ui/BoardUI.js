export class BoardUI {
  constructor(scene, gridGraphics) {
    this.scene = scene
    this.gridGraphics = gridGraphics
  }

  createCells(onCellClick) {
    const cells = []

    for (let index = 0; index < 9; index += 1) {
      const cell = this.scene.add
        .rectangle(0, 0, 1, 1, 0x000000, 0)
        .setOrigin(0)
        .setDepth(4)
        .setInteractive({ useHandCursor: true })

      cell.on('pointerdown', () => {
        onCellClick(index)
      })

      cells.push(cell)
    }

    return cells
  }

  createMark(marks, index, player) {
    if (marks[index]) {
      marks[index].destroy()
    }

    marks[index] = this.scene.add
      .text(0, 0, player, {
        color: player === 'X' ? '#ff3355' : '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '72px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(4)

    return marks[index]
  }

  getLayout({ centerPanelX, panelTop, centerPanelWidth, centerPanelHeight }) {
    const boardSize = Math.min(centerPanelWidth * 0.72, centerPanelHeight * 0.76, 560)
    const cellSize = boardSize / 3
    const boardX = centerPanelX + (centerPanelWidth - boardSize) / 2
    const boardY = panelTop + (centerPanelHeight - boardSize) / 2

    return {
      boardSize,
      cellSize,
      boardX,
      boardY,
    }
  }

  layout({ boardX, boardY, boardSize, cellSize, cells, marks, protectedMarkers, protectedSquares }) {
    this.drawGrid(boardX, boardY, boardSize, cellSize)
    this.positionCells(cells, boardX, boardY, cellSize)
    this.positionMarks(marks, boardX, boardY, cellSize)
    this.positionProtectedMarkers(protectedMarkers, protectedSquares, boardX, boardY, cellSize)
  }

  drawGrid(boardX, boardY, boardSize, cellSize) {
    this.gridGraphics.clear()
    this.drawGridLines(boardX, boardY, boardSize, cellSize, 14, 0xff003c, 0.22)
    this.drawGridLines(boardX, boardY, boardSize, cellSize, 4, 0xff3355, 1)
  }

  drawGridLines(boardX, boardY, boardSize, cellSize, width, color, alpha) {
    this.gridGraphics.lineStyle(width, color, alpha)

    for (let line = 1; line < 3; line += 1) {
      const offset = line * cellSize

      this.gridGraphics.lineBetween(boardX + offset, boardY, boardX + offset, boardY + boardSize)
      this.gridGraphics.lineBetween(boardX, boardY + offset, boardX + boardSize, boardY + offset)
    }
  }

  positionCells(cells, boardX, boardY, cellSize) {
    cells.forEach((cell, index) => {
      const column = index % 3
      const row = Math.floor(index / 3)

      cell.setPosition(boardX + column * cellSize, boardY + row * cellSize)
      cell.setSize(cellSize, cellSize)
      cell.input.hitArea.setTo(0, 0, cellSize, cellSize)
    })
  }

  positionMarks(marks, boardX, boardY, cellSize) {
    marks.forEach((mark, index) => {
      const column = index % 3
      const row = Math.floor(index / 3)

      mark.setPosition(boardX + column * cellSize + cellSize / 2, boardY + row * cellSize + cellSize / 2)
      mark.setFontSize(Math.floor(cellSize * 0.48))
    })
  }

  positionProtectedMarkers(protectedMarkers, protectedSquares, boardX, boardY, cellSize) {
    protectedMarkers.forEach((marker, index) => {
      if (!marker || !protectedSquares.has(index)) {
        return
      }

      const column = index % 3
      const row = Math.floor(index / 3)
      marker.setPosition(boardX + column * cellSize + 16, boardY + row * cellSize + 16)
      marker.setRadius(Math.max(8, cellSize * 0.08))
    })
  }
}
