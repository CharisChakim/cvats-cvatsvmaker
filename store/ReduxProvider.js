'use client';

import { useEffect } from 'react';
import { Provider } from 'react-redux';
import store, { loadPersistedResume } from '.';
import { hydrateResume } from './slices/resumeSlice';

// The saved CV is applied here rather than as preloadedState so that the server's
// render and the client's first render both start from the same empty defaults.
// Effects run after that first pass, so nothing has been committed to the DOM yet
// when the real data arrives.
const HydrateOnMount = () => {
    useEffect(() => {
        const saved = loadPersistedResume();
        if (saved) store.dispatch(hydrateResume(saved));
    }, []);
    return null;
};

const ReduxProvider = ({ children }) => {
    return (
        <Provider store={store}>
            <HydrateOnMount />
            {children}
        </Provider>
    );
};

export default ReduxProvider;
