// Shaders customizados espelhados na engenharia reversa do PokéBonk

export const billboardVertexShader = `
  attribute vec3 iPos;
  attribute vec2 iSize;
  attribute vec4 iUV;
  attribute vec4 iFx; // x: hitFlash, y: dissolve, z: outlineCode, w: squash

  uniform float uLean; // 0.35 padrão PokéBonk

  varying vec2 vUv;
  varying vec4 vFx;

  void main() {
    vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 camUp    = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    vec3 up       = normalize(mix(vec3(0.0, 1.0, 0.0), camUp, uLean));

    float sq = iFx.w; // squash & stretch
    vec2 size = iSize * vec2(1.0 + sq * 0.35, 1.0 - sq * 0.3);

    vec3 worldPos = iPos + camRight * (position.x * size.x) + up * (position.y * size.y);
    vec4 mvPos = viewMatrix * vec4(worldPos, 1.0);

    // Deslocamento sutil em direção à câmera para não cortar os pés no chão
    mvPos.z += 0.25 + iSize.y * 0.05;

    gl_Position = projectionMatrix * mvPos;
    vUv = vec2(mix(iUV.x, iUV.z, uv.x), mix(iUV.y, iUV.w, uv.y));
    vFx = iFx;
  }
`;

export const billboardFragmentShader = `
  uniform sampler2D map;
  uniform vec2 uTexel;
  uniform float uTime;

  varying vec2 vUv;
  varying vec4 vFx;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec4 col = texture2D(map, vUv);

    // Contorno (Outline por amostragem de texels vizinhos)
    float outlineCode = vFx.z;
    if (col.a < 0.5) {
      if (outlineCode > 0.5) {
        float n = max(
          max(texture2D(map, vUv + vec2(uTexel.x, 0.0)).a, texture2D(map, vUv - vec2(uTexel.x, 0.0)).a),
          max(texture2D(map, vUv + vec2(0.0, uTexel.y)).a, texture2D(map, vUv - vec2(0.0, uTexel.y)).a)
        );
        if (n < 0.5) discard;

        // 1.0 = Jogador (Ciano/Branco), 2.0 = Elite (Dourado), 3.0 = Menos Boss (Vermelho Carmesim)
        vec3 outCol = outlineCode < 1.5 ? vec3(0.3, 0.8, 1.0) :
                      outlineCode < 2.5 ? vec3(1.0, 0.85, 0.2) : vec3(1.0, 0.15, 0.1);
        gl_FragColor = vec4(outCol * 1.5, 1.0);
        return;
      }
      discard;
    }

    // Dissolve de Morte (Desintegração em Reishi)
    float diss = vFx.y;
    if (diss > 0.0) {
      float n = hash(floor(vUv / uTexel));
      if (n < diss) discard;
      if (n < diss + 0.12) {
        gl_FragColor = vec4(vec3(0.2, 0.9, 1.8), 1.0);
        return;
      }
    }

    // Flash branco ao receber dano
    vec3 finalRgb = mix(col.rgb, vec3(1.0), vFx.x);

    gl_FragColor = vec4(finalRgb, col.a);
  }
`;
