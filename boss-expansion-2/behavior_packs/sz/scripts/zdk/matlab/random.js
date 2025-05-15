/**
 * @param {Array} list 
*/
export function randomChoice(array) {
    let index = Math.floor(Math.random() * array.length);
    return array[index]
}

/**
 * @param {Array} array 
 * @param {number} [n=1] 
*/
export function randomSample(array, n=1) {
    if (n > array.length) return array;

    let result = [];
    let copidArray = [...array];
    for (let i = 0; i < n; i++) {
        const index = Math.floor(Math.random() * copidArray.length);
        result.push(copidArray.splice(index, 1)[0]);
    }
    return result;
}
