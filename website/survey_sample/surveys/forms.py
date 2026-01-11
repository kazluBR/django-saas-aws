from django import forms

class SurveyResponseForm(forms.Form):
    respondent_email = forms.EmailField(required=False, label="Email (optional)")
    
    def __init__(self, *args, survey=None, **kwargs):
        super().__init__(*args, **kwargs)
        
        if survey:
            for question in survey.questions.all():
                field_name = f'question_{question.id}'
                
                if question.question_type == 'text':
                    self.fields[field_name] = forms.CharField(
                        label=question.text,
                        required=question.is_required,
                        widget=forms.Textarea(attrs={'rows': 3})
                    )
                elif question.question_type == 'choice':
                    choices = [(c.id, c.text) for c in question.choices.all()]
                    self.fields[field_name] = forms.ChoiceField(
                        label=question.text,
                        choices=choices,
                        required=question.is_required,
                        widget=forms.RadioSelect
                    )
                elif question.question_type == 'rating':
                    self.fields[field_name] = forms.ChoiceField(
                        label=question.text,
                        choices=[(i, str(i)) for i in range(1, 6)],
                        required=question.is_required,
                        widget=forms.RadioSelect
                    )