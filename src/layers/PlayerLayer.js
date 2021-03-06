import BaseLayer from './BaseLayer'
import {defaultTheme, defaultConfig} from '../theme'
import Player from '../components/Player'

import store from '../store'
import {action} from '../action'
import {stateKey, layerType} from '../enums'

import drawArc from '../shapes/arc'

export default class PlayerLayer extends BaseLayer {
  constructor (container) {
    super(container)
    this.type = layerType.PLAYER
    this.stateKey = stateKey.PLAYER
  }

  update () {
    let newState = store.getState(this.stateKey)
    // Do nothing if the state is dirty
    if (!newState.dirty) {
      return
    }

    let {columns, rows, players, newRenderStates} = newState,
        width = this.container.offsetWidth,
        height = this.container.offsetHeight,
        widthPerBlock = width / columns,
        heightPerBlock = height / rows

    this.finalRenderState = players.map((player) => {
      let {row, column} = player.position,
          centerX = column * widthPerBlock + widthPerBlock / 2,
          centerY = row * heightPerBlock + heightPerBlock / 2,
          radius = Math.min(widthPerBlock, heightPerBlock) * 0.8 / 2 

      return {
        x: column * widthPerBlock + widthPerBlock / 2,
        y: row * heightPerBlock + heightPerBlock / 2,
        radius: Math.min(widthPerBlock, heightPerBlock) * 0.8 / 2,
        stone: player
      }
    })

    while (newRenderStates.length > 0) {
      // Move all new renderstates to current render states
      // This should always run after we have renderState created
      this.renderState.push(newRenderStates.pop())
    }

    // We have computed final render state based on new state
    store.dispatch(action.updateDirty(false, this.stateKey))
    // Now that we have new final render state, we need to let
    // render function to take care of rendering it
    this.dirty = true
  }

  render (dt) {
    if (!this.dirty) {
      return
    }

    if (!this.renderState) {
      // Deep clone
      this.renderState = this.finalRenderState.map((fstate) => {
        return Object.assign({}, fstate)
      })
    }
    else {
      let cleanCount = 0,
          removedRenderStates = []

      this.renderState.forEach((rstate) => {
        let fstate = this.finalRenderState.filter((state) => state.stone === rstate.stone)[0]
        if (!fstate) {
          removedRenderStates.push(rstate)
          return 
        }

        let deltaDistance = defaultConfig.enemySpeed * dt,
            totalDistanceX = fstate.x - rstate.x,
            totalDistanceY = fstate.y - rstate.y

        // Check if we reached final render state
        if (totalDistanceX === 0 && totalDistanceY === 0) {
          cleanCount++
        }
        this.dirty = cleanCount < this.renderState.length

        if (!this.dirty) {
          return 
        }

        if (totalDistanceX > 0) {
          rstate.x += Math.min(deltaDistance, Math.abs(totalDistanceX))
        }
        else {
          rstate.x -= Math.min(deltaDistance, Math.abs(totalDistanceX))
        }

        if (totalDistanceY > 0) {
          rstate.y += Math.min(deltaDistance, Math.abs(totalDistanceY))
        }
        else {
          rstate.y -= Math.min(deltaDistance, Math.abs(totalDistanceY))
        }
      })

      // Remove from render states
      removedRenderStates.forEach((removedRenderState) => {
        let removedIndex = this.renderState.indexOf(removedRenderState)
        this.renderState.splice(removedIndex, 1)
      })
    }

    this.element.width = this.container.offsetWidth
    this.element.height = this.container.offsetHeight
    
    this.renderState.forEach((rstate) => {
      let player = rstate.stone
      if (player.alive) {
        drawArc(this.context, {
          fillStyle: player.fillStyle,
          x: rstate.x,
          y: rstate.y,
          radius: rstate.radius,
          startAngle: 0,
          endAngle: Math.PI * 2
        })
      }
    })
  }
}