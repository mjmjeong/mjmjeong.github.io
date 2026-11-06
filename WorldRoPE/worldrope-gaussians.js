(() => {
  'use strict';
  const root = document.getElementById('gaussian-explorer');
  if (!root) return;
  const $ = id => document.getElementById(id);
  const canvas = $('gaussian-canvas');
  const status = $('gaussian-viewer-status');
  const cache = new Map();
  let manifest, scene, records, layer = 3, view = 'query', yaw = -.25, pitch = -.12;
  let distance = 8, pan = [0, 0, 0], sequence = 0, framePending = false;
  let mainRenderer;
  const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
  const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const norm = a => { const length = Math.hypot(...a); return a.map(x => x / length); };
  const column = (matrix, i) => matrix.slice(0, 3).map(row => row[i]);

  // Project full 3D covariance with J Sigma J^T; draw depth-sorted elliptical
  // Gaussian quads. Native WebGL2 keeps this local preview free of CDN imports.
  class SplatRenderer {
    constructor(target) {
      this.canvas = target;
      const gl = this.gl = target.getContext('webgl2', {alpha: false, antialias: false, preserveDrawingBuffer: true});
      if (!gl) throw new Error('This browser needs WebGL 2 to display the Gaussian viewer.');
      const shader = (kind, source) => {
        const result = gl.createShader(kind); gl.shaderSource(result, source); gl.compileShader(result);
        if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(result));
        return result;
      };
      const program = this.program = gl.createProgram();
      gl.attachShader(program, shader(gl.VERTEX_SHADER, `#version 300 es
        precision highp float;
        layout(location=0) in vec2 corner;
        layout(location=1) in vec2 center;
        layout(location=2) in vec2 axisA;
        layout(location=3) in vec2 axisB;
        layout(location=4) in vec4 rgba;
        uniform vec2 resolution;
        out vec2 uv; out vec4 color;
        void main() {
          uv = corner * 3.; color = rgba;
          vec2 p = center + axisA * uv.x + axisB * uv.y;
          gl_Position = vec4(p.x / resolution.x * 2. - 1., 1. - p.y / resolution.y * 2., 0., 1.);
        }`));
      gl.attachShader(program, shader(gl.FRAGMENT_SHADER, `#version 300 es
        precision highp float;
        in vec2 uv; in vec4 color; out vec4 outputColor;
        void main() {
          float radius = dot(uv, uv);
          if (radius > 9.) discard;
          float alpha = min(.99, color.a * exp(-.5 * radius));
          if (alpha < .003) discard;
          outputColor = vec4(color.rgb, alpha);
        }`));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
      const quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      this.buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      for (const [location, size, offset] of [[1,2,0],[2,2,8],[3,2,16],[4,4,24]]) {
        gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location,size,gl.FLOAT,false,40,offset);
        gl.vertexAttribDivisor(location, 1);
      }
      this.resolution = gl.getUniformLocation(program, 'resolution');
    }
    render(data, camera) {
      const gl = this.gl, target = this.canvas;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(target.clientWidth * dpr));
      const height = Math.max(1, Math.round(target.clientHeight * dpr));
      target.width = width; target.height = height;
      const scale = Math.min(width / 256, height / 256);
      const fx = camera.K[0][0] * scale, fy = camera.K[1][1] * scale;
      const cx = width / 2 + (camera.K[0][2]-128)*scale;
      const cy = height / 2 + (camera.K[1][2]-128)*scale;
      const basis = [column(camera.c2w,0),column(camera.c2w,1),column(camera.c2w,2)];
      const origin = column(camera.c2w,3), projected = [];
      for (let n=0; n<data.length; n+=13) {
        const delta = [data[n]-origin[0],data[n+1]-origin[1],data[n+2]-origin[2]];
        const [x,y,z] = basis.map(row => dot(row,delta));
        if (z < .05 || data[n+12] < .003) continue;
        const u = fx*x/z+cx, v = fy*y/z+cy;
        const jx = basis[0].map((value,i)=>fx/z*(value-x/z*basis[2][i]));
        const jy = basis[1].map((value,i)=>fy/z*(value-y/z*basis[2][i]));
        const cov = [data[n+3],data[n+4],data[n+5],data[n+4],data[n+6],data[n+7],data[n+5],data[n+7],data[n+8]];
        const quadratic = (a,b) => {
          let result = 0; for(let i=0;i<3;i++)for(let j=0;j<3;j++)result+=a[i]*cov[i*3+j]*b[j];
          return result;
        };
        const a = quadratic(jx,jx)+.3, b = quadratic(jx,jy), c = quadratic(jy,jy)+.3;
        const discriminant = Math.hypot(a-c,2*b);
        const l1 = Math.min(Math.sqrt(Math.max(.3,(a+c+discriminant)/2)), Math.max(width,height)*2);
        const l2 = Math.min(Math.sqrt(Math.max(.3,(a+c-discriminant)/2)), Math.max(width,height)*2);
        if(u+3*l1<0 || u-3*l1>width || v+3*l1<0 || v-3*l1>height)continue;
        const angle = .5*Math.atan2(2*b,a-c), cos=Math.cos(angle),sin=Math.sin(angle);
        projected.push({z, values:[u,v,l1*cos,l1*sin,-l2*sin,l2*cos,data[n+9],data[n+10],data[n+11],data[n+12]]});
      }
      projected.sort((a,b)=>b.z-a.z);
      const buffer = new Float32Array(projected.length*10);
      projected.forEach((item,i)=>buffer.set(item.values,i*10));
      gl.viewport(0,0,width,height); gl.clearColor(.045,.055,.07,1); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(this.program); gl.bindVertexArray(this.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer); gl.bufferData(gl.ARRAY_BUFFER,buffer,gl.DYNAMIC_DRAW);
      gl.uniform2f(this.resolution,width,height); gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArraysInstanced(gl.TRIANGLES,0,6,projected.length);
      this.visible = projected.length;
    }
  }

  function orbitCamera() {
    const base = scene.cameras.key.c2w, target = scene.center.map((x,i)=>x+pan[i]);
    const columns = [column(base,0),column(base,1),column(base,2)];
    const forward = columns[0].map((x,i)=>x*Math.sin(yaw)*Math.cos(pitch)+columns[1][i]*Math.sin(pitch)+columns[2][i]*Math.cos(yaw)*Math.cos(pitch));
    const right = norm(cross(columns[1],forward)), down = cross(forward,right);
    const origin = target.map((x,i)=>x-forward[i]*distance);
    return {K:scene.cameras.key.K,c2w:[...right.map((_,i)=>[right[i],down[i],forward[i],origin[i]]),[0,0,0,1]]};
  }
  function render() {
    framePending = false;
    if (!records || !scene) return;
    mainRenderer.render(records, view === 'orbit' ? orbitCamera() : scene.cameras[view]);
    root.dataset.renderedLayer = String(layer+1);
    root.dataset.renderedScene = scene.id;
    $('gaussian-count').textContent = `${records.length/13} Gaussians · Layer ${layer+1}`;
  }
  function schedule() { if(!framePending){framePending=true;requestAnimationFrame(render);} }
  function setCamera(name) {
    view=name;
    root.querySelectorAll('[data-gaussian-camera]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.gaussianCamera===name)));
    schedule();
  }
  async function loadLayer() {
    const token = ++sequence, selected = scene, selectedLayer = layer;
    root.dataset.loading = 'true';
    status.hidden = false; status.textContent = `Loading ${selected.name} · Layer ${selectedLayer+1}…`;
    try {
      const filename = selected.layers[selectedLayer].file;
      if (!cache.has(filename)) cache.set(filename,fetch(`assets/gaussians/${filename}`, {cache:'no-store'}).then(response=>{
        if(!response.ok)throw new Error(`Gaussian data returned ${response.status}`);
        return response.arrayBuffer();
      }).catch(error=>{cache.delete(filename);throw error;}));
      const data = new Float32Array(await cache.get(filename));
      if(token!==sequence)return;
      if(data.length!==selected.layers[selectedLayer].count*13)throw new Error('Incomplete Gaussian data');
      records=data; status.hidden=true; root.dataset.loading='false';
      $('gaussian-title').textContent = `${selected.name} · Layer ${selectedLayer+1}`;
      $('gaussian-description').textContent = 'Drag to orbit · Scroll to zoom · Shift + drag to pan';
      $('gaussian-download').href = `assets/gaussians/${selected.id}/layer-${selectedLayer+1}.ply`;
      root.querySelectorAll('[data-gaussian-layer]').forEach(button=>button.setAttribute('aria-selected',String(Number(button.dataset.gaussianLayer)===layer)));
      schedule();
    } catch(error) {
      if(token!==sequence)return;
      records=null; root.dataset.loading='error'; status.hidden=false; status.textContent=error.message;
    }
  }
  function selectScene(index) {
    scene=manifest.scenes[(index+manifest.scenes.length)%manifest.scenes.length];
    records=null; yaw=-.25; pitch=-.12; distance=scene.radius*1.4; pan=[0,0,0];
    $('gaussian-scene-label').textContent=scene.name;
    root.querySelectorAll('[data-scene-index]').forEach(button=>{
      const active=manifest.scenes[Number(button.dataset.sceneIndex)]===scene;
      button.setAttribute('aria-pressed',String(active));
      if(active) {
        const strip=$('gaussian-scene-strip');
        const cardRect=button.getBoundingClientRect(), stripRect=strip.getBoundingClientRect();
        if(getComputedStyle(strip).flexDirection==='row')
          strip.scrollTo({left:strip.scrollLeft+cardRect.left-stripRect.left-3,behavior:'smooth'});
        else strip.scrollTo({top:strip.scrollTop+cardRect.top-stripRect.top-3,behavior:'smooth'});
      }
    });
    loadLayer();
  }
  async function initialize() {
    try {
      mainRenderer=new SplatRenderer(canvas);
      const response=await fetch('assets/gaussians/manifest.json', {cache:'no-store'});
      if(!response.ok)throw new Error('Scene manifest could not be loaded.');
      manifest=await response.json();
      const strip=$('gaussian-scene-strip');
      manifest.scenes.forEach((item,index)=>{
        const button=document.createElement('button'); button.type='button'; button.dataset.sceneIndex=index;
        button.className='gaussian-scene-card'; button.setAttribute('aria-label',`Select ${item.name}`);
        const keyImage=document.createElement('img'); keyImage.src=`assets/gaussians/${item.key}`; keyImage.alt=`${item.name} key view`;
        const queryImage=document.createElement('img'); queryImage.src=`assets/gaussians/${item.query}`; queryImage.alt=`${item.name} query view`;
        const label=document.createElement('span');label.textContent=item.name;
        button.append(keyImage,queryImage,label);button.addEventListener('click',()=>selectScene(index));strip.append(button);
      });
      root.querySelectorAll('[data-gaussian-layer]').forEach(button=>button.addEventListener('click',()=>{
        layer=Number(button.dataset.gaussianLayer);loadLayer();
      }));
      root.querySelectorAll('[data-gaussian-camera]').forEach(button=>button.addEventListener('click',()=>setCamera(button.dataset.gaussianCamera)));
      $('gaussian-scene-prev').addEventListener('click',()=>selectScene(manifest.scenes.indexOf(scene)-1));
      $('gaussian-scene-next').addEventListener('click',()=>selectScene(manifest.scenes.indexOf(scene)+1));
      $('gaussian-reset').addEventListener('click',()=>{
        yaw=-.25;pitch=-.12;distance=scene.radius*1.4;pan=[0,0,0];setCamera('orbit');
      });
      let drag;
      canvas.addEventListener('pointerdown',event=>{
        canvas.setPointerCapture(event.pointerId);drag=[event.clientX,event.clientY];
        if(view!=='orbit') {
          const pose=scene.cameras[view].c2w, delta=scene.center.map((x,i)=>x-pose[i][3]);
          const local=[0,1,2].map(axis=>dot(column(scene.cameras.key.c2w,axis),delta));
          distance=Math.max(.2,Math.hypot(...local)); yaw=Math.atan2(local[0],local[2]);pitch=Math.asin(Math.max(-1,Math.min(1,local[1]/distance)));
          pan=[0,0,0];setCamera('orbit');
        }
      });
      canvas.addEventListener('pointermove',event=>{
        if(!drag)return;const dx=event.clientX-drag[0],dy=event.clientY-drag[1];drag=[event.clientX,event.clientY];
        if(event.shiftKey){pan[0]-=dx*distance*.002;pan[1]-=dy*distance*.002;}
        else{yaw-=dx*.006;pitch=Math.max(-1.4,Math.min(1.4,pitch-dy*.006));}
        schedule();
      });
      canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
      canvas.addEventListener('wheel',event=>{
        event.preventDefault();if(view!=='orbit')setCamera('orbit');
        distance=Math.max(.2,Math.min(150,distance*Math.exp(event.deltaY*.001)));schedule();
      },{passive:false});
      canvas.addEventListener('keydown',event=>{
        if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(event.key))return;
        event.preventDefault();setCamera('orbit');
        if(event.key==='ArrowLeft')yaw-=.1;if(event.key==='ArrowRight')yaw+=.1;
        if(event.key==='ArrowUp')pitch=Math.max(-1.4,pitch-.1);if(event.key==='ArrowDown')pitch=Math.min(1.4,pitch+.1);
        if(event.key==='+')distance*=.9;if(event.key==='-')distance*=1.1;schedule();
      });
      new ResizeObserver(schedule).observe(canvas);
      window.addEventListener('resize',schedule);
      setCamera(view);
      selectScene(0);
    } catch(error){status.hidden=false;status.textContent=error.message;root.dataset.loading='error';}
  }
  initialize();
})();
