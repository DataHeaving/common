export function deepCopy<T, TKey extends keyof T = keyof T>(
  source: T,
  copyableProperties: ReadonlyArray<TKey>,
): { [P in TKey]: T[P] };
export function deepCopy<T>(source: T): T;
export function deepCopy<T, TKey extends keyof T = keyof T>(
  source: T,
  copyableProperties?: ReadonlyArray<TKey>,
): { [P in TKey]: T[P] } {
  return copyableProperties
    ? copyableProperties.reduce<{ [P in TKey]: T[P] }>(
        (newObject, propertyName) => {
          newObject[propertyName] = deepCopyFull(source[propertyName]);
          return newObject;
        },
        ({} as unknown) as { [P in TKey]: T[P] },
      )
    : (deepCopyFull(source) as { [P in TKey]: T[P] });
}

function deepCopyFull<T>(source: T): T {
  switch (typeof source) {
    case "object":
      if (Array.isArray(source)) {
        return (source.map(
          (item) => deepCopy(item) as unknown,
        ) as unknown) as T;
      } else {
        return (Object.fromEntries(
          Object.entries(source).map(([propertyName, propertyValue]) => [
            propertyName,
            deepCopy(propertyValue),
          ]),
        ) as unknown) as T;
      }
    default:
      return source;
  }
}

// export type TPathComponent = string | number;
// export interface TDiffInfo {
//   path: ReadonlyArray<TPathComponent>;
//   change: "I" | "D" | "U";
// }
// export function calculateDiffPaths(x: unknown, y: unknown) {
//   const retVal: Array<TDiffInfo> = [];
//   calculateDiffPathsImpl(x, y, [], "", retVal);
//   return retVal;
// }
// function calculateDiffPathsImpl(
//   x: unknown,
//   y: unknown,
//   parentPaths: ReadonlyArray<TPathComponent>,
//   thisProperty: TPathComponent,
//   allResults: Array<TDiffInfo>,
// ) {
//   let wasSimpleDifference = false;
//   switch (typeof x) {
//     case "object":
//       if (typeof y === "object") {
//         if (Array.isArray(x)) {
//           if (Array.isArray(y)) {
//             const max = Math.max(x.length, y.length);
//             let idx = 0;
//             while (idx < max) {
//               if (idx >= x.length) {
//                 // y has extra element -> treat as insertion
//                 allResults.push({
//                   path: parentPaths.concat([thisProperty, idx]),
//                   change: "I",
//                 });
//               } else if (idx >= y.length) {
//                 // x has extra element -> treat as deletion
//                 allResults.push({
//                   path: parentPaths.concat([thisProperty, idx]),
//                   change: "D",
//                 });
//               } else {
//                 // Both elements present in array - perform recurive check
//                 calculateDiffPathsImpl(
//                   x[idx],
//                   y[idx],
//                   parentPaths.concat(thisProperty),
//                   idx,
//                   allResults,
//                 );
//               }
//               ++idx;
//             }
//           } else {
//             wasSimpleDifference = true;
//           }
//         } else {
//           if (x !== null && y !== null && !Array.isArray(y)) {
//             for (const key of new Set<string>(
//               Object.keys(x).concat(Object.keys(y)),
//             )) {
//               const isInX = key in x;
//               const isInY = key in y;
//               if (isInX && isInY) {
//                 calculateDiffPathsImpl(
//                   (x as any)[key], // eslint-disable-line
//                   (y as any)[key], // eslint-disable-line
//                   parentPaths,
//                   key,
//                   allResults,
//                 );
//               } else if (!isInX) {
//                 // y has extra element - treat as insertion
//                 allResults.push({
//                   path: parentPaths.concat(thisProperty),
//                   change: "I",
//                 });
//               } else {
//                 // x has extra element - treat as deletion
//                 allResults.push({
//                   path: parentPaths.concat(thisProperty),
//                   change: "D",
//                 });
//               }
//             }
//           } else {
//             wasSimpleDifference = true;
//           }
//         }
//       }
//       break;
//     default:
//       wasSimpleDifference = true;
//       break;
//   }

//   if (wasSimpleDifference && x !== y) {
//     allResults.push({
//       path: parentPaths.concat(thisProperty),
//       change: "U",
//     });
//   }
// }

export const getChunks = <T>(array: ReadonlyArray<T>, maxLength: number) => {
  let retVal: Array<Array<T>> | undefined = undefined;
  if (maxLength >= array.length) {
    retVal = [[...array]];
  } else if (maxLength <= 1) {
    retVal = array.map((element) => [element]);
  } else {
    retVal = [];
    iterateChunks(array, maxLength, (chunk) => retVal?.push(chunk));
  }
  return retVal;
};

export const iterateChunks = <T>(
  array: ReadonlyArray<T>,
  maxLength: number,
  onChunk: (chunk: Array<T>, startIndex: number) => unknown,
) => {
  let start = 0;
  while (start + maxLength <= array.length) {
    onChunk(array.slice(start, start + maxLength), start);
    start += maxLength;
  }

  if (start < array.length) {
    maxLength = array.length - start;
    onChunk(array.slice(start, start + maxLength), start);
  }
};

export const getOrDefault = <T>(
  currentValue: T | undefined,
  defaultValue: T | undefined,
) => {
  const retVal = currentValue ?? defaultValue;
  return retVal;
};

export function getOrDefaultOrThrow<T>(
  currentValue: T | undefined,
  defaultValue: T,
): T;
export function getOrDefaultOrThrow<T>(
  currentValue: T | undefined,
  defaultValue: T | undefined,
  descriptorString: () => string,
  context: () => string,
): T;
export function getOrDefaultOrThrow<T>(
  currentValue: T | undefined,
  defaultValue: T | undefined,
  descriptorString?: () => string,
  context?: () => string,
) {
  const retVal = getOrDefault(currentValue, defaultValue);
  if (retVal === undefined) {
    let errorMsg: string;
    if (descriptorString && context) {
      const str = descriptorString();
      errorMsg = `No ${str} specified for ${context()}, and no default ${str} specified either.`;
    } else {
      errorMsg = `Default value was undefined`;
    }
    throw new Error(errorMsg);
  }

  return retVal;
}

// export const unwrapItemOrFactory = <T, TParams extends Array<unknown>>(
//   itemOrFactory: types.ItemOrFactory<
//     T extends () => unknown ? never : T,
//     TParams
//   >,
//   ...parameters: TParams
// ) =>
//   typeof itemOrFactory === "function"
//     ? itemOrFactory(...parameters)
//     : itemOrFactory;
