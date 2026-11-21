/**
 * An entry of the index.json storybook builds.
 */
export type StoryIndexEntry = {
    /**
     * The id used in the url of the story.
     */
    id: string,
    /**
     * The title of the stories file, like 'Ui/Button'.
     */
    title: string,
    /**
     * The name of the story, like 'Variants'.
     */
    name: string,
    /**
     * Whether the entry is a story or a docs page.
     */
    type: 'story' | 'docs'
};
