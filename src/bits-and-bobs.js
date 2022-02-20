'use strict';

// Given a Container of some description, you should be able to zip
// any number of sources in the Container.

// Exclusive range.
class Range {
  constructor(start, end) {
    this.start = start;
    this.end = end;

    return new Proxy(this, {
      has(target, prop) {
        return prop >= target.start && prop <= target.end;
      },
      get(target, prop) {
        try {
          if (prop === 'length') return target.end - target.start;

          if (prop in target) return target[prop];

          const parsedProp = parseInt(prop, 10);
          if (!Number.isNaN(parsedProp)) {
            const result = parsedProp + target.start;
            if (result >= target.end || result < target.start) {
              throw new Error('Index out of range.');
            }
            return result;
          } else {
            throw new Error(`No case for prop named ${prop}. Throwing.`);
          }
        } catch (error) {
          console.error(error);
          return null;
        }
      }
    });
  }
  
  getBounds() {
    return [this.start, this.end];
  }

  getValue() {
    const newRange = [];
    if (this.end == this.start) return newRange;

    const direction = Math.sign(this.end - this.start);
    
    for (let index = this.start; direction == 1 ? index < this.end : index > this.end; index += direction) {
      newRange.push(index);
    }

    return newRange;
  }
}

class Container {
  constructor(...sources) {
    this.sources = sources ?? [];
    this.value = sources;
  }

  getValue() {
    return this.value;
  }

  addSource(newSource) {
    this.sources.push(Array.isArray(newSource) ? newSource : [newSource]);
    return this;
  }
  
  addRange(start, end) {
    this.sources.push(new Range(start, end));
    return this;
  }

  zip() {
    // Zips longest. Pushes `null` if item doesn't exist.

    let numberOfSources = 0;
    let largestSourceLength = 0;

    for (let index = 0; index < this.sources.length; index++) {
      numberOfSources += 1;
      largestSourceLength = largestSourceLength < this.sources[index].length ? this.sources[index].length : largestSourceLength;
    }

    let zippedItems = [];
    const newValue = [];
    
    for (let index = 0; index < largestSourceLength; index++) {
      for (let sourceNumber = 0; sourceNumber < numberOfSources; sourceNumber++) {
        zippedItems.push(this.sources[sourceNumber][index] ?? null);
      }

      newValue.push(zippedItems);
      zippedItems = [];
    }

    this.value = newValue;
    return this;
  }
}

const testCase1 = new Range(1, 10);
console.log(testCase1.getBounds());

const testCase2 = new Container().addRange(1, 10).addRange(11, 20).addSource(764132);

console.log(testCase2.getValue());
console.log(testCase2.zip().getValue());
