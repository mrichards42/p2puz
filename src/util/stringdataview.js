/**
 * A DataView class with additional string functions
 * @class StringDataView
 */
export default function StringDataView(...args) {
  // Have to do it this way since babel doesn't handle extending builtins
  const dv = new DataView(...args)

  /**
   * Returns a string by reading 8-bit characters
   * @memberof StringDataView
   * @alias getString8
   * @param {number} byteOffset - read data starting from this byte
   * @param {number} [length] - number of characters to read
   * @returns {string}
   */
  dv.getString8 = function(byteOffset, length = this.byteLength) {
    const arr = new Uint8Array(this.buffer, this.byteOffset + byteOffset, length)
    return String.fromCharCode.apply(null, arr)
  }

  /**
   * Returns a string by reading 16-bit characters
   * @memberof StringDataView
   * @alias getString16
   * @param {number} byteOffset - read data starting from this byte
   * @param {number} [length] - number of characters to read
   * @returns {string}
   */
  dv.getString16 = function(byteOffset, length = this.byteLength) {
    const arr = new Uint16Array(this.buffer, this.byteOffset + byteOffset, length)
    return String.fromCharCode.apply(null, arr)
  }

  /**
   * Returns a delimited string by reading 8-bit characters
   * @memberof StringDataView
   * @alias getDelimitedString8
   * @param {number} byteOffset  - read data starting from this byte
   * @param {number|character} [delimiter='\0'] - stop reading at this character
   * @returns {string}
   */
  dv.getDelimitedString8 = function(byteOffset, delimiter = 0) {
    if (typeof delimiter === 'string') delimiter = delimiter.charCodeAt(0)
    for (let i = byteOffset; i < this.byteLength; ++i) {
      if (this.getUint8(i) === delimiter) {
        return this.getString8(byteOffset, i - byteOffset)
      }
    }
    return this.getString8(byteOffset)
  }

  /**
   * Returns a delimited string by reading 16-bit characters
   * @memberof StringDataView
   * @alias getDelimitedString16
   * @param {number} byteOffset  - read data starting from this byte
   * @param {number|character} [delimiter='\0'] - stop reading at this character
   * @returns {string}
   */
  dv.getDelimitedString16 = function(byteOffset, delimiter = 0) {
    if (typeof delimiter === 'string') delimiter = delimiter.charCodeAt(0)
    for (let i = byteOffset; i < this.byteLength; ++i) {
      if (this.getUint16(i) === delimiter) {
        return this.getString16(byteOffset, i - byteOffset)
      }
    }
    return this.getString16(byteOffset)
  }

  return dv
}
