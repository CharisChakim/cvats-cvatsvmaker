import { createSlice } from '@reduxjs/toolkit';

const defaultResume = {
    contact: {},
    summary: {},
    education: [],
    experience: [],
    projects: [],
    skills: {},
    certificates: [],
    languages: [],

    template: 'classic',
    onePage: 'normal',
    font: 'Carlito',
    saved: false,
    lang: 'en',
};

const resumeSlice = createSlice({
    name: 'resume',
    initialState: defaultResume,
    reducers: {
        updateResumeValue: (state, action) => {
            const { tab, name, value, index } = action.payload;
            if (index != null) {
                state[tab][index][name] = value;
            } else {
                state[tab][name] = value;
            }

            state.saved = false;
        },

        addNewIndex: (state, action) => {
            const { tab, name, value } = action.payload;
            state[tab].push({});
            // state[tab].push({ [name]: [value] });
            state.saved = false;
        },

        deleteIndex: (state, action) => {
            const { index, tab } = action.payload;
            console.log('deleting', index, 'from', tab);
            state[tab].splice(index, 1);
            state.saved = false;
        },

        // for move index
        moveIndex: (state, action) => {
            const { index, tab, dir } = action.payload;

            const newIndex = dir === 'up' ? index - 1 : index + 1;

            const temp = state[tab][index];
            state[tab][index] = state[tab][newIndex];
            state[tab][newIndex] = temp;
            state.saved = false;
        },

        setFullResume: (state, action) => {
            return {
                ...state,
                ...action.payload,
                saved: false,
            };
        },

        setTemplate: (state, action) => {
            state.template = action.payload;
            state.saved = false;
        },

        setOnePage: (state, action) => {
            state.onePage = action.payload;
            state.saved = false;
        },

        setFont: (state, action) => {
            state.font = action.payload;
            state.saved = false;
        },

        saveResume: state => {
            state.saved = true;
        },

        setLang: (state, action) => {
            state.lang = action.payload;
        },
    },
});

export const {
    updateResumeValue,
    addNewIndex,
    deleteIndex,
    saveResume,
    moveIndex,
    setFullResume,
    setTemplate,
    setOnePage,
    setFont,
    setLang,
} = resumeSlice.actions;
export default resumeSlice.reducer;
