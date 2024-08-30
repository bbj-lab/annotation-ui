new Vue({
    el: '#app',
    data: {
        currentRow: 0,
        totalRows: 0,
        note: {},
        gotoRow: 1,
        showMessage: false,
        isSaving: false,
        saveNext: false,
        saveMessage: '',
        currentFile: '',
        fileLoaded: false // New data property
    },
    computed: {
        noteTitle() {
            return `File: ${this.currentFile}, Row ${this.note.row_id + 1}/${this.note.total_rows}`;
        },
        highlightedText() {
            let noteText = this.note.text || '';
            const highlights = [];

            if (this.note.section && noteText.includes(this.note.section)) {
                highlights.push({
                    start: noteText.indexOf(this.note.section),
                    end: noteText.indexOf(this.note.section) + this.note.section.length,
                    class: 'highlight-pink'
                });
            }

            if (this.note.answer && this.note.type !== 'Yes/No' && noteText.includes(this.note.answer)) {
                highlights.push({
                    start: noteText.indexOf(this.note.answer),
                    end: noteText.indexOf(this.note.answer) + this.note.answer.length,
                    class: 'highlight-yellow'
                });
            }

            if (this.note.source && noteText.includes(this.note.source)) {
                highlights.push({
                    start: noteText.indexOf(this.note.source),
                    end: noteText.indexOf(this.note.source) + this.note.source.length,
                    class: 'highlight-green'
                });
            }

            highlights.sort((a, b) => {
                if (a.start === b.start) {
                    // If start positions are the same, prioritize by highlight class
                    if (a.class === 'highlight-yellow') return -1;
                    if (b.class === 'highlight-yellow') return 1;
                    if (a.class === 'highlight-green') return -1;
                    if (b.class === 'highlight-green') return 1;
                }
                return a.start - b.start;
            });

            let offset = 0;
            let resultText = '';
            let lastIndex = 0;

            highlights.forEach((highlight, index) => {
                const { start, end, class: highlightClass } = highlight;
                if (index === 0 || start >= lastIndex) {
                    resultText += noteText.slice(lastIndex, start) + `<span class="${highlightClass}">` + noteText.slice(start, end) + '</span>';
                    lastIndex = end;
                }
            });
            resultText += noteText.slice(lastIndex);

            return resultText;
        },
    },
    methods: {
        loadNote() {
            fetch(`/api/note/${this.currentRow}`)
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        alert(data.error);
                    } else {
                        this.note = data;
                        this.note.invalid_label = this.note.invalid_label === 1 ? 1 : 0;
                        this.note.not_specified = this.note.not_specified === 1 ? 1 : 0;
                        this.totalRows = data.total_rows;
                        this.gotoRow = this.currentRow + 1;
                        this.fileLoaded = true;
                        this.$nextTick(() => {
                            if (this.$refs.answerField) {
                                this.$refs.answerField.focus();
                            }
                            this.scrollToHighlight();
                        });
                    }
                })
                .catch(error => {
                    console.error('Error loading note:', error);
                });
        },
        prevNote() {
            this.saveNote().then(() => {
                if (this.currentRow > 0) {
                    this.currentRow--;
                    this.loadNote();
                }
            }).catch(error => {
                console.error('Error saving note:', error);
            });
        },
        nextNote() {
            this.saveNote().then(() => {
                if (this.currentRow < this.totalRows - 1) {
                    this.currentRow++;
                    this.loadNote();
                }
            }).catch(error => {
                console.error('Error saving note:', error);
            });
        },
        goToNote() {
            this.saveNote().then(() => {
                const gotoRow = this.gotoRow - 1;
                if (gotoRow >= 0 && gotoRow < this.totalRows) {
                    this.currentRow = gotoRow;
                    this.loadNote();
                }
            }).catch(error => {
                console.error('Error saving note:', error);
            });
        },
        saveNote() {
            return new Promise((resolve, reject) => {
                this.isSaving = true;
                const data = {
                    question: this.note.question || '',
                    type: this.note.type || '',
                    answer: this.note.answer || '',
                    section: this.note.section || '',
                    source: this.note.source || '',
                    explanation: this.note.explanation || '',
                    invalid_label: this.note.invalid_label ? 1 : 0,
                    not_specified: this.note.not_specified ? 1 : 0
                };

                fetch(`/api/note/${this.currentRow}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success') {
                            this.showMessage = true;
                            this.saveMessage = `File Saved`;
                            this.isSaving = false;
                            setTimeout(() => {
                                this.showMessage = false;
                            }, 3000);  // Display for 3 seconds
                            if (this.saveNext && this.currentRow < this.totalRows - 1) {
                                this.currentRow++;
                                this.saveNext = false;
                                this.loadNote();
                            }
                            resolve();
                        } else {
                            alert('Error saving note');
                            this.isSaving = false;
                            reject('Error saving note');
                        }
                    })
                    .catch(error => {
                        console.error('Error saving note:', error);
                        this.isSaving = false;
                        reject(error);
                    });
            });
        },
        handleFileUpload(event) {
            const file = event.target.files[0];
            if (file) {
                const formData = new FormData();
                formData.append('file', file);
                fetch('/api/file', {
                    method: 'POST',
                    body: formData,
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success') {
                            this.totalRows = data.total_rows;
                            this.currentRow = 0;
                            this.currentFile = file.name;
                            this.fileLoaded = true;
                            this.loadNote();
                        } else {
                            alert('Error loading file');
                        }
                    })
                    .catch(error => {
                        console.error('Error uploading file:', error);
                    });
            }
        },
        goToFirstUnreviewed() {
            let found = false;
            for (let i = 0; i < this.totalRows; i++) {
                fetch(`/api/note/${i}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.Reviewed == 0 && !found) {
                            found = true;
                            this.currentRow = i;
                            this.loadNote();
                        }
                    })
                    .catch(error => {
                        console.error('Error going to first unreviewed note:', error);
                    });
                if (found) break;
            }
        },
        saveAndNext() {
            this.saveNext = true;
            this.saveNote();
        },
        scrollToHighlight() {
            this.$nextTick(() => {
                const container = this.$refs.noteContainer;
                const highlightElementSource = container.querySelector('.highlight-green');
                const highlightElementSection = container.querySelector('.highlight-pink');
                const highlightElementAnswer = container.querySelector('.highlight-yellow');

                let scrollTarget = null;

                if (highlightElementSource) {
                    scrollTarget = highlightElementSource;
                } else if (highlightElementSection) {
                    scrollTarget = highlightElementSection;
                } else if (highlightElementAnswer) {
                    scrollTarget = highlightElementAnswer;
                } else {
                    container.scrollTop = 0;
                }

                if (scrollTarget) {
                    const lineHeight = 20; // Adjust this value if your line height is different
                    const linesAbove = 20;
                    const offset = Math.max(0, scrollTarget.offsetTop - linesAbove * lineHeight);
                    container.scrollTop = offset;
                }
            });
        },
        handleNotSpecified() {
            if (this.note.not_specified) {
                this.note.answer = '';
                if (this.note.question_type === 'yes') {
                    this.note.answer = '';
                }
            }
        },
        markEdited() {
            this.note.edited = 1;
        }
    },
    watch: {
        'note.answer': function(newVal) {
            if (newVal) {
                this.note.not_specified = 0;
                this.markEdited();
            }
        },
        'note.question': function(newVal) {
            this.markEdited();
        },
        'note.type': function(newVal) {
            this.markEdited();
        },
        'note.section': function(newVal) {
            this.markEdited();
        },
        'note.source': function(newVal) {
            this.markEdited();
        },
        'note.explanation': function(newVal) {
            this.markEdited();
        },
        'note.question_type': function(newVal) {
            if (newVal && (this.note.answer === 'Yes' || this.note.answer === 'No')) {
                this.note.not_specified = 0;
            }
            this.markEdited();
        },
        'note.not_specified': function(newVal, oldVal) {
            this.handleNotSpecified();
            this.markEdited();
        },
        'note.invalid_label': function(newVal) {
            this.markEdited();
        }
    },
    created() {
        document.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && (event.key === 's' || event.key === "Enter")) {
                event.preventDefault();
                this.saveAndNext();
            }
            if ((event.altKey || event.metaKey) && event.key === 'ArrowDown') {
                event.preventDefault();
                this.prevNote();
            }
            if ((event.altKey || event.metaKey) && event.key === 'ArrowUp') {
                event.preventDefault();
                this.nextNote();
            }
        });
    }
});

