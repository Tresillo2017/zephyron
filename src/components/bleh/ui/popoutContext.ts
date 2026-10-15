import { createContext } from 'react';

/** Lets MenuItem close the surrounding menu after a click. */
export const PopoutContext = createContext<{ close: () => void } | null>(null);
