<template>
  <div id="app">
    <div class="container">
      <mouse-topo
        ref="topo"
        class="contours bordered"
        :scale="controls.scale.value"
        :ping="controls.ping.value"
        :force="controls.force.value"
        :decay="controls.decay.value"
        :paused="paused"
        :interface-id="interfaceId"
      />
    </div>
    <table class="controls">
      <thead><tr>Controls</tr></thead>

      <tbody>
        <tr
          v-for="(control, name) in controls"
          :key="name"
        >
          <td><label for="name">{{ name }} ({{ control.units || '' }})</label></td>
          <td>
            <input
              id="name"
              v-model.number="control.value"
              type="range"
              name="name"
              :min="control.min"
              :max="control.max"
            >
          </td>
          <td>
            <div class="control-value">
              {{ control.value }}
            </div>
          </td>
        </tr>
      </tbody>

      <button @click="reset">
        reset
      </button>
      <button @click="randomize">
        randomize
      </button>
      <button @click="paused = true">
        pause
      </button>
      <button @click="paused = false">
        resume
      </button>
    </table>

    <div
      :id="interfaceId"
      style="position: relative; flex-grow: 1; height: 100%;"
      class="interface bordered"
    >
      <button
        style="position: absolute;"
      >
        test
      </button>
    </div>
  </div>
</template>

<script>
import MouseTopo from './vue-mouse-topography.vue';

const CONTROLS = {
  scale: {
    min: 1,
    max: 100,
    units: null,
    value: 20,
  },
  ping: {
    min: 5,
    max: 50,
    units: 'ms',
    value: 15,
  },
  force: {
    min: 1,
    max: 10,
    units: null,
    value: 8,
  },
  decay: {
    min: 15,
    max: 3000,
    units: 'ms',
    value: 2000,
  },
}

export default {
  name: 'App',
  components: { MouseTopo },
  data() {
    return {
      paused: false, interfaceId: 'mouse-interface', controls: CONTROLS, 
    }
  },
  methods: {
    reset () {
      this.$refs.topo.reset()
    },
    randomize () {
      this.$refs.topo.randomize()
    },
  },
};
</script>

<style>
#app {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;

  display: flex;

  background: pink;
}

.container {
  width: 50%;
  height: 500px;

  display: flex;
  flex-direction:column;
}

.contours {
  height: 100%;
}

.interface {
  position: absolute;
  height: 100%;
  width: 100%;

}

.mouse-interface {
  background-color: #efefff;
}

.bordered {
  border: 5px solid black;
}
</style>
