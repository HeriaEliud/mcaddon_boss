function toVec3(input) {
  if (input instanceof Object && "x" in input && "y" in input && "z" in input) {
    return input;
  } else if (Array.isArray(input) && input.length === 3) {
    return { x: input[0], y: input[1], z: input[2] };
  } else if (typeof input === "object" && input.length === 3) {
    return { x: input[0], y: input[1], z: input[2] };
  } else {
    throw new Error("Invalid input for Vec3 operation");
  }
}

export function vec_add(v1, v2) {
  v1 = toVec3(v1);
  v2 = toVec3(v2);
  return { x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z };
}

export function vec_sub(v1, v2) {
  v1 = toVec3(v1);
  v2 = toVec3(v2);
  return { x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z };
}

export function vec_scale(v, scalar) {
  v = toVec3(v);
  return { x: v.x * scalar, y: v.y * scalar, z: v.z * scalar };
}

export function vec_mul(v1, v2) {
  v1 = toVec3(v1);
  v2 = toVec3(v2);
  return { x: v1.x * v2.x, y: v1.y * v2.y, z: v1.z * v2.z };
}

export function vec_div(v, scalar) {
  if (scalar === 0) {
    throw new Error("Division by zero");
  }
  v = toVec3(v);
  return { x: v.x / scalar, y: v.y / scalar, z: v.z / scalar };
}

export function vec_len(v) {
  v = toVec3(v);
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function vec_normalize(v) {
  v = toVec3(v);
  const len = vec_len(v);
  if (len === 0) {
    throw new Error("Cannot normalize a zero-length vector");
  }
  return vec_divide_scalar(v, len);
}

export function vec_divide_scalar(v, scalar) {
  v = toVec3(v);
  return { x: v.x / scalar, y: v.y / scalar, z: v.z / scalar };
}

export function vec_dot(v1, v2) {
  v1 = toVec3(v1);
  v2 = toVec3(v2);
  return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
}

export function vec_cross(v1, v2) {
  v1 = toVec3(v1);
  v2 = toVec3(v2);
  return {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x,
  };
}

export function vec3_distance(v1, v2) {
  v1 = toVec3(v1);
  v2 = toVec3(v2);
  return vec_len(vec_sub(v1, v2));
}
