import { createSlice } from '@reduxjs/toolkit';

/**
 * Section order and visibility. Purely a manifest — the data for built-in sections
 * stays in its own top-level slot, so parsing, serialising and the PDF templates keep
 * reading it exactly as before.
 *
 * The default is the order the editor has always used, so a fresh session looks
 * untouched; rearranging is something you go and do, not something that happens to
 * you. Harvard's own guidance is to "list headings in order of importance", which the
 * previous hardcoded order made impossible.
 */
export const DEFAULT_SECTIONS = [
    { id: 'contact', visible: true }, // always first, cannot be hidden or moved
    { id: 'summary', visible: true },
    { id: 'education', visible: true },
    { id: 'experience', visible: true },
    { id: 'projects', visible: true },
    { id: 'skills', visible: true },
    { id: 'certificates', visible: true },
    { id: 'languages', visible: true },
];

export const isCustomSection = id => typeof id === 'string' && id.startsWith('custom-');

// Custom sections live in their own map; built-ins keep their existing slot.
const bucket = (state, tab) => {
    if (!isCustomSection(tab)) return state[tab];
    if (!state.custom[tab]) state.custom[tab] = [];
    return state.custom[tab];
};

const nextCustomId = sections => {
    const used = sections
        .filter(s => isCustomSection(s.id))
        .map(s => Number(s.id.slice('custom-'.length)))
        .filter(Number.isFinite);
    return `custom-${used.length ? Math.max(...used) + 1 : 1}`;
};

export const DEFAULT_RESUME = {
    contact: {},
    summary: {},
    education: [],
    experience: [],
    projects: [],
    skills: {},
    certificates: [],
    languages: [],

    sections: DEFAULT_SECTIONS,
    custom: {},

    template: 'classic',
    onePage: 'normal',
    font: 'Carlito',
    saved: false,
    lang: 'en',

    // How the current data got here, and the text it came from. Kept so the editor
    // can say which path ran and offer an AI re-parse when the rule-based reading
    // looks wrong — a silently wrong parse is worse than a slow one.
    parsedBy: null,
    parseSourceText: '',
};

const resumeSlice = createSlice({
    name: 'resume',
    initialState: DEFAULT_RESUME,
    reducers: {
        updateResumeValue: (state, action) => {
            const { tab, name, value, index } = action.payload;
            if (index != null) {
                bucket(state, tab)[index][name] = value;
            } else {
                state[tab][name] = value;
            }

            state.saved = false;
        },

        addNewIndex: (state, action) => {
            const { tab } = action.payload;
            bucket(state, tab).push({});
            state.saved = false;
        },

        deleteIndex: (state, action) => {
            const { index, tab } = action.payload;
            bucket(state, tab).splice(index, 1);
            state.saved = false;
        },

        // for move index
        moveIndex: (state, action) => {
            const { index, tab, dir } = action.payload;
            const items = bucket(state, tab);
            const newIndex = dir === 'up' ? index - 1 : index + 1;

            const temp = items[index];
            items[index] = items[newIndex];
            items[newIndex] = temp;
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

        addSection: (state, action) => {
            const { title, shape = 'timeline' } = action.payload || {};
            const id = nextCustomId(state.sections);
            state.sections.push({ id, title: title || 'New Section', shape, visible: true });
            state.custom[id] = [];
            state.saved = false;
        },

        removeSection: (state, action) => {
            const id = action.payload;
            if (id === 'contact') return;
            state.sections = state.sections.filter(s => s.id !== id);
            if (isCustomSection(id)) delete state.custom[id];
            state.saved = false;
        },

        renameSection: (state, action) => {
            const { id, title } = action.payload;
            const section = state.sections.find(s => s.id === id);
            if (section) section.title = title;
            state.saved = false;
        },

        toggleSectionVisible: (state, action) => {
            const id = action.payload;
            if (id === 'contact') return; // the header is not optional
            const section = state.sections.find(s => s.id === id);
            if (section) section.visible = !section.visible;
            state.saved = false;
        },

        moveSection: (state, action) => {
            const { id, dir } = action.payload;
            const index = state.sections.findIndex(s => s.id === id);
            const target = dir === 'up' ? index - 1 : index + 1;
            // Contact holds position 0 as the CV header, so nothing may move above it.
            if (index < 1 || target < 1 || target >= state.sections.length) return;
            const [moved] = state.sections.splice(index, 1);
            state.sections.splice(target, 0, moved);
            state.saved = false;
        },

        // Applied once, on mount, from localStorage. Anything saved before a key
        // existed comes back missing it, so the defaults fill the gaps.
        hydrateResume: (state, action) => ({
            ...DEFAULT_RESUME,
            ...action.payload,
            sections: action.payload?.sections?.length ? action.payload.sections : DEFAULT_SECTIONS,
            custom: action.payload?.custom || {},
        }),

        setParseMeta: (state, action) => {
            const { parsedBy = null, sourceText = '' } = action.payload || {};
            state.parsedBy = parsedBy;
            state.parseSourceText = sourceText;
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
    hydrateResume,
    setParseMeta,
    addSection,
    removeSection,
    renameSection,
    toggleSectionVisible,
    moveSection,
} = resumeSlice.actions;
export default resumeSlice.reducer;
