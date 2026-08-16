import { configureStore } from '@reduxjs/toolkit';
import resumeSlice from './slices/resumeSlice';

/**
 * Read the saved resume, or undefined if there is nothing usable.
 *
 * Deliberately NOT wired into `preloadedState`: the server has no localStorage, so it
 * would render the empty default while the client rendered the saved CV, and every
 * returning visitor's editor would fail to hydrate. ReduxProvider applies this after
 * mount instead, so both first passes agree and the saved data lands on the next
 * render.
 */
export const loadPersistedResume = () => {
    try {
        const serializedState = localStorage.getItem('reduxState');
        if (serializedState === null) return undefined;
        return JSON.parse(serializedState)?.resume;
    } catch (err) {
        console.warn('Error loading state from local storage');
        return undefined;
    }
};

const store = configureStore({
    devTools: true,
    reducer: {
        resume: resumeSlice,
    },
});

function debounce(func, timeout = 2500) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this, args);
        }, timeout);
    };
}

const saveState = debounce(() => {
    console.info('Saving State to Local Storage...');
    // How this CV was parsed, and the text it came from, belong to the visit that
    // uploaded it: the source text is several KB of duplicated CV, and restoring the
    // "read without AI" notice days later would be telling the user about a decision
    // they no longer have any context for.
    const { parsedBy, parseSourceText, ...resume } = store.getState().resume;
    localStorage.setItem('reduxState', JSON.stringify({ ...store.getState(), resume }));
});

store.subscribe(saveState);

export default store;
