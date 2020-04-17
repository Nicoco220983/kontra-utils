import { Sprite, SpriteSheet, audioAssets } from './kontra.min.mjs'

const { abs, floor, min, max, sqrt, random: rand } = Math

export function createFullScreenCanvas(width, height) {
    const canvasEl = document.createElement("canvas")
    canvasEl.width = width
    canvasEl.height = height
    const canvasWoH = width / height
    const windowWoH = window.innerWidth / window.innerHeight
    if (canvasWoH > windowWoH) {
        canvasEl.style.width = window.innerWidth + "px"
        canvasEl.style.height = floor(window.innerWidth / canvasWoH) + "px"
    } else {
        canvasEl.style.height = window.innerHeight + "px"
        canvasEl.style.width = floor(window.innerHeight * canvasWoH) + "px"
    }
    document.body.appendChild(canvasEl)
}

export function sign(a) {
    if (a === 0) return 0
    return (a > 0) ? 1 : -1
}

export function clamp(a, min, max) {
    if (a < min) return min
    if (a > max) return max
    return a
}

export function randge(from, to) {
    return from + rand() * (to - from)
}

export function accTo(spd, tgtSpd, acc, dec, dt) {
    if (spd == tgtSpd) return spd
    const a = (spd == 0 || spd * tgtSpd > 0) ? (acc * dt) : (dec * dt)
    if (tgtSpd > 0 || (tgtSpd == 0 && spd < 0)) {
        return min(spd + a, tgtSpd)
    } else if (tgtSpd < 0 || (tgtSpd == 0 && spd > 0)) {
        return max(spd - a, tgtSpd)
    }
}

export function moveTo(pos, tgt, spd, spdMax, acc, dec, dt) {
    const dist = tgt - pos, adist = abs(dist), sdist = sign(dist)
    const tgtSpd = clamp(sdist * sqrt(adist * dec), -spdMax, spdMax)
    return accTo(spd, tgtSpd, acc, dec, dt)
}

export function Lazy(builder) {
    return {
        builder,
        get: function () {
            if (this.value === undefined) {
                this.value = this.builder()
            }
            return this.value
        }
    }
}

export function Img(src) {
    const image = new Image()
    image.src = src
    return image
}

export function LazyImg(src) {
    return Lazy(() => Img(src))
}

export function Anims(kwargs) {
    return SpriteSheet(kwargs).animations
}

export function LazyAnims(kwargs) {
    return Lazy(() => Anims(kwargs))
}

export function Text(kwargs) {
    const res = Sprite(kwargs)
    res.value = kwargs && kwargs.value
    res.render = function () {
        const ctx = this.context
        ctx.font = this.font || "20px Georgia"
        ctx.textAlign = this.textAlign || "center"
        ctx.textBaseline = this.textBaseline || "middle"
        ctx.fillStyle = this.color || "black"
        const value = this.getValue ? this.getValue() : this.value
        if (kwargs && kwargs.lineHeight) {
            let i = 0
            value.split('\n').forEach(line => {
                ctx.fillText(line, this.x, this.y + i++ * kwargs.lineHeight)
            })
        } else {
            ctx.fillText(value, this.x, this.y)
        }
    }
    return res
}

export function Flash(kwargs) {
    if (!kwargs.ttl) kwargs.ttl = 15
    const res = Sprite(kwargs)
    res.x = 0
    res.y = 0
    res.ottl = res.ttl
    res.render = function () {
        const rgb = this.rgb || "255,255,255"
        const age = 1 - this.ttl / this.ottl
        const ctx = this.context
        const width = this.width, height = this.height
        const size = min(width, height), center = size / 2
        const grd = ctx.createRadialGradient(
            center, center, .4 * size,
            center, center, (.3 * age + .7) * size);
        grd.addColorStop(0, `rgba(${rgb},0)`)
        grd.addColorStop(1, `rgba(${rgb},${1 - age})`)
        if (width > height) ctx.setTransform(width / height, 0, 0, 1, 0, 0)
        else ctx.setTransform(1, 0, 0, height / width, 0, 0)
        ctx.fillStyle = grd
        ctx.fillRect(0, 0, size, size)
        ctx.setTransform(1, 0, 0, 1, 0, 0)
    }
    return res
}

export function getPos(obj) {
    const ox = obj.x, ow = obj.width, oy = obj.y, oh = obj.height
    const oa = obj.anchor
    const oax = oa ? oa.x : 0, oay = oa ? oa.y : 0
    return {
        x: ox - ow * oax,
        width: ow,
        y: oy - oh * oay,
        height: oh,
        anchor: { x: 0, y: 0 }
    }
}

const Audios = []

export function Aud(src, kwargs) {
    const aud = new Audio()
    aud.src = src
    Object.assign(aud, kwargs)
    Audios.push(aud)
    return aud
}

export function LazyAud(src) {
    return Lazy(() => Aud(src))
}

function _getAllAudios() {
    return Audios.concat(Object.values(audioAssets))
}

export function pauseAudios() {
    _getAllAudios().forEach(a => {
        if (a.currentTime == 0 || a.ended) return
        a.pause()
        a.pausedByGame = true
    })
}

export function unpauseAudios() {
    _getAllAudios().forEach(a => {
        if (!a.pausedByGame) return
        a.play()
        a.pausedByGame = false
    })
}

export function replayAudio(aud, kwargs) {
    aud.currentTime = 0
    Object.assign(aud, kwargs)
    _syncAudioVolume(aud)
    aud.play()
}

let VolumeLevel = 1

export function setVolumeLevel(val) {
    VolumeLevel = val
    _syncAllAudiosVolume()
}

function _syncAudioVolume(aud) {
    const baseVolume = aud.baseVolume || 1
    aud.volume = baseVolume * VolumeLevel
}

function _syncAllAudiosVolume() {
    _getAllAudios().forEach(_syncAudioVolume)
}

export function Pool(nb, gen) {
    const pool = []
    for (let i = 0; i < nb; ++i) pool.push(gen())
    return {
        pool,
        curIte: 0,
        next: function () {
            const i = this.curIte
            const res = this.pool[i]
            this.curIte = (i + 1) % this.pool.length
            return res
        }
    }
}

export function AudioPool(nb, aud) {
    return Pool(nb, () => {
        const aud2 = aud.cloneNode()
        Audios.push(aud2)
        return aud2
    })
}

export function on(obj, evt, callback) {
    let evts = obj.events
    if (!evts) evts = obj.events = {}
    let callbacks = evts[evt]
    if (!callbacks) callbacks = evts[evt] = {}
    if (typeof callback === "function") {
        for (let i = 0; ; ++i) {
            const key = "_" + i
            if (callbacks[key] === undefined) {
                callbacks[key] = callback
                return
            }
        }
    } else {
        for (let key in callback)
            callbacks[key] = callback[key]
    }
}

export function off(obj, evt, key) {
    if (evt === undefined) { delete obj.events; return }
    let evts = obj.events
    if (!evts) return
    if (key === undefined) { delete evts[evt]; return }
    let callbacks = evts[evt]
    if (!callbacks) return
    delete callbacks[key]
}

export function trigger(obj, evt, ...args) {
    let evts = obj.events
    if (!evts) return
    let callbacks = evts[evt]
    if (!callbacks) return
    for (let key in callbacks) {
        if (callbacks[key].call(obj, ...args) === false) {
            delete callbacks[key]
        }
    }
}

export function remove(obj) {
    obj.isAlive = function () { return false }
    trigger(obj, "remove")
}