import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ConversationFlowEditor.css';

// ==========================================
// CONVERSATION FLOW EDITOR COMPONENT
// ==========================================
// Allows clients to configure bot response flow
// Drag-and-drop reordering with locked steps
// ==========================================

interface FlowStep {
  id: number;
  type: 'greeting' | 'knowledge_base' | 'ai_response' | 'agent_handoff';
  order: number;
  locked: boolean;
  enabled: boolean;
  removable: boolean;
  settings: any;
}

interface ConversationFlowEditorProps {
  widgetId: number;
  onSave?: () => void;
}

const STEP_ICONS: Record<string, string> = {
  greeting: '👋',
  knowledge_base: '📚',
  ai_response: '🤖',
  agent_handoff: '👤'
};

const STEP_LABELS: Record<string, string> = {
  greeting: 'Greeting Message',
  knowledge_base: 'Knowledge Base Search',
  ai_response: 'AI Smart Response',
  agent_handoff: 'Agent Handoff'
};

const STEP_DESCRIPTIONS: Record<string, string> = {
  greeting: 'Welcome message shown when conversation starts',
  knowledge_base: 'Search your knowledge base for matching answers (FREE)',
  ai_response: 'Use AI to generate smart responses ($0.01 per response)',
  agent_handoff: 'Connect visitor to a human agent (last resort)'
};

export const ConversationFlowEditor: React.FC<ConversationFlowEditorProps> = ({ widgetId, onSave }) => {
  const [steps, setSteps] = useState<FlowStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch flow on mount
  useEffect(() => {
    fetchFlow();
  }, [widgetId]);

  const fetchFlow = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`/api/widgets/${widgetId}/flow`);
      setSteps(response.data.conversation_flow || []);
    } catch (err: any) {
      console.error('Error fetching flow:', err);
      setError('Failed to load conversation flow');
    } finally {
      setLoading(false);
    }
  };

  const saveFlow = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await axios.put(`/api/widgets/${widgetId}/flow`, {
        conversation_flow: steps
      });

      setSuccess('Conversation flow updated successfully!');
      if (onSave) onSave();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);

    } catch (err: any) {
      console.error('Error saving flow:', err);
      setError(err.response?.data?.error || 'Failed to save conversation flow');
    } finally {
      setSaving(false);
    }
  };

  const resetFlow = async () => {
    if (!confirm('Are you sure you want to reset to the default flow? This cannot be undone.')) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await axios.post(`/api/widgets/${widgetId}/flow/reset`);
      setSteps(response.data.conversation_flow);
      setSuccess('Flow reset to default successfully!');

      setTimeout(() => setSuccess(null), 3000);

    } catch (err: any) {
      console.error('Error resetting flow:', err);
      setError('Failed to reset conversation flow');
    } finally {
      setSaving(false);
    }
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const step = steps[index];

    // Check if step is locked
    if (step.locked) {
      setError('This step cannot be moved');
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Check boundaries
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === steps.length - 1) return;

    // Check if target position is locked
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const targetStep = steps[targetIndex];
    
    if (targetStep.locked) {
      setError('Cannot swap with a locked step');
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Swap steps
    const newSteps = [...steps];
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    
    // Update order values
    newSteps.forEach((step, idx) => {
      step.order = idx + 1;
    });

    setSteps(newSteps);
  };

  const toggleStep = (index: number) => {
    const newSteps = [...steps];
    newSteps[index].enabled = !newSteps[index].enabled;
    setSteps(newSteps);
  };

  const removeStep = (index: number) => {
    const step = steps[index];

    if (!step.removable) {
      setError('This step cannot be removed');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!confirm(`Are you sure you want to remove "${STEP_LABELS[step.type]}"?`)) {
      return;
    }

    const newSteps = steps.filter((_, idx) => idx !== index);
    
    // Update order values
    newSteps.forEach((step, idx) => {
      step.order = idx + 1;
    });

    setSteps(newSteps);
  };

  if (loading) {
    return (
      <div className="flow-editor-loading">
        <i className="fas fa-spinner fa-spin"></i>
        <p>Loading conversation flow...</p>
      </div>
    );
  }

  return (
    <div className="conversation-flow-editor">
      <div className="flow-editor-header">
        <div>
          <h3>🔄 Conversation Flow</h3>
          <p className="flow-editor-description">
            Configure how your bot responds to visitors. Steps are executed in order until one succeeds.
          </p>
        </div>
        <div className="flow-editor-actions">
          <button 
            className="btn btn-secondary" 
            onClick={resetFlow}
            disabled={saving}
          >
            <i className="fas fa-undo"></i> Reset to Default
          </button>
          <button 
            className="btn btn-primary" 
            onClick={saveFlow}
            disabled={saving}
          >
            {saving ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Saving...
              </>
            ) : (
              <>
                <i className="fas fa-save"></i> Save Flow
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <i className="fas fa-check-circle"></i> {success}
        </div>
      )}

      <div className="flow-steps">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className={`flow-step ${step.locked ? 'locked' : ''} ${!step.enabled ? 'disabled' : ''}`}>
              <div className="step-header">
                <div className="step-info">
                  <span className="step-icon">{STEP_ICONS[step.type]}</span>
                  <div className="step-details">
                    <div className="step-title">
                      {step.locked && <i className="fas fa-lock lock-icon"></i>}
                      <strong>{STEP_LABELS[step.type]}</strong>
                      {step.locked && <span className="locked-badge">LOCKED</span>}
                    </div>
                    <p className="step-description">{STEP_DESCRIPTIONS[step.type]}</p>
                  </div>
                </div>

                <div className="step-controls">
                  {/* Enable/Disable Toggle */}
                  <button
                    className={`btn-icon ${step.enabled ? 'btn-success' : 'btn-secondary'}`}
                    onClick={() => toggleStep(index)}
                    title={step.enabled ? 'Disable step' : 'Enable step'}
                  >
                    <i className={`fas ${step.enabled ? 'fa-check' : 'fa-times'}`}></i>
                  </button>

                  {/* Move Up */}
                  <button
                    className="btn-icon"
                    onClick={() => moveStep(index, 'up')}
                    disabled={step.locked || index === 0}
                    title="Move up"
                  >
                    <i className="fas fa-arrow-up"></i>
                  </button>

                  {/* Move Down */}
                  <button
                    className="btn-icon"
                    onClick={() => moveStep(index, 'down')}
                    disabled={step.locked || index === steps.length - 1}
                    title="Move down"
                  >
                    <i className="fas fa-arrow-down"></i>
                  </button>

                  {/* Remove */}
                  {step.removable && (
                    <button
                      className="btn-icon btn-danger"
                      onClick={() => removeStep(index)}
                      title="Remove step"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  )}
                </div>
              </div>

              {/* Step Settings (collapsed for now) */}
              {step.settings && Object.keys(step.settings).length > 0 && (
                <div className="step-settings">
                  <small className="text-muted">
                    <i className="fas fa-cog"></i> Configured
                  </small>
                </div>
              )}
            </div>

            {/* Arrow between steps */}
            {index < steps.length - 1 && (
              <div className="flow-arrow">
                <i className="fas fa-arrow-down"></i>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="flow-editor-footer">
        <div className="cost-estimate">
          <h4>💰 Cost Optimization</h4>
          <div className="cost-breakdown">
            <div className="cost-item">
              <span className="cost-label">📚 Knowledge Base:</span>
              <span className="cost-value free">FREE</span>
              <span className="cost-percent">~80% of queries</span>
            </div>
            <div className="cost-item">
              <span className="cost-label">🤖 AI Response:</span>
              <span className="cost-value">$0.01 each</span>
              <span className="cost-percent">~15% of queries</span>
            </div>
            <div className="cost-item">
              <span className="cost-label">👤 Agent Handoff:</span>
              <span className="cost-value free">FREE</span>
              <span className="cost-percent">~5% of queries</span>
            </div>
          </div>
          <p className="cost-note">
            <i className="fas fa-lightbulb"></i> 
            <strong>Tip:</strong> Keep Knowledge Base before AI to minimize costs. Most questions can be answered from your knowledge base for free!
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConversationFlowEditor;

