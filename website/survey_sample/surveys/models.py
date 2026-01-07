from django.db import models

class Survey(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return self.title
    
    class Meta:
        ordering = ['-created_at']

class Question(models.Model):
    QUESTION_TYPES = [
        ('text', 'Text'),
        ('choice', 'Multiple Choice'),
        ('rating', 'Rating (1-5)'),
    ]
    
    survey = models.ForeignKey(Survey, on_delete=models.CASCADE, related_name='questions')
    text = models.CharField(max_length=500)
    question_type = models.CharField(max_length=10, choices=QUESTION_TYPES, default='text')
    image = models.ImageField(upload_to='question_images/', blank=True, null=True)
    order = models.IntegerField(default=0)
    is_required = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.survey.title} - {self.text[:50]}"
    
    class Meta:
        ordering = ['order']

class Choice(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='choices')
    text = models.CharField(max_length=200)
    image = models.ImageField(upload_to='choice_images/', blank=True, null=True)
    order = models.IntegerField(default=0)
    
    def __str__(self):
        return self.text
    
    class Meta:
        ordering = ['order']

class Response(models.Model):
    survey = models.ForeignKey(Survey, on_delete=models.CASCADE, related_name='responses')
    respondent_email = models.EmailField(blank=True, null=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Response to {self.survey.title} at {self.submitted_at}"

class Answer(models.Model):
    response = models.ForeignKey(Response, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    text_answer = models.TextField(blank=True, null=True)
    choice_answer = models.ForeignKey(Choice, on_delete=models.SET_NULL, blank=True, null=True)
    rating_answer = models.IntegerField(blank=True, null=True)
    
    def __str__(self):
        return f"Answer to {self.question.text[:30]}"