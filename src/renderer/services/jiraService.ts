import axios, { AxiosInstance } from 'axios';

export interface JiraConfig {
  url: string;
  email: string;
  apiToken: string;
}

export interface JiraTicket {
  key: string;
  summary: string;
  status: string;
  lastUpdated: string;
  assignee: string;
  updated: string;
}

class JiraService {
  private client: AxiosInstance | null = null;

  configure(config: JiraConfig) {
    const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
    
    this.client = axios.create({
      baseURL: `${config.url}/rest/api/3`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async findStaleTickets(hoursThreshold: number = 48): Promise<JiraTicket[]> {
    if (!this.client) {
      throw new Error('Jira client not configured');
    }

    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursThreshold);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    // JQL query to find tickets not updated in the specified time
    const jql = `updated < "${cutoffDateStr}" AND status != Done AND status != Closed ORDER BY updated ASC`;

    try {
      const response = await this.client.get('/search', {
        params: {
          jql,
          fields: 'summary,status,updated,assignee',
          maxResults: 100,
        },
      });

      return response.data.issues.map((issue: any) => ({
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status.name,
        lastUpdated: this.formatDate(issue.fields.updated),
        assignee: issue.fields.assignee?.displayName || 'Unassigned',
        updated: issue.fields.updated,
      }));
    } catch (error: any) {
      console.error('Error fetching Jira tickets:', error);
      throw new Error(error.response?.data?.errorMessages?.[0] || 'Failed to fetch tickets');
    }
  }

  async addComment(issueKey: string, comment: string): Promise<void> {
    if (!this.client) {
      throw new Error('Jira client not configured');
    }

    try {
      await this.client.post(`/issue/${issueKey}/comment`, {
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: comment,
                },
              ],
            },
          ],
        },
      });
    } catch (error: any) {
      console.error(`Error adding comment to ${issueKey}:`, error);
      throw new Error(error.response?.data?.errorMessages?.[0] || 'Failed to add comment');
    }
  }

  async updateStatus(issueKey: string, transitionId: string): Promise<void> {
    if (!this.client) {
      throw new Error('Jira client not configured');
    }

    try {
      await this.client.post(`/issue/${issueKey}/transitions`, {
        transition: {
          id: transitionId,
        },
      });
    } catch (error: any) {
      console.error(`Error updating status for ${issueKey}:`, error);
      throw new Error(error.response?.data?.errorMessages?.[0] || 'Failed to update status');
    }
  }

  async updateAssignee(issueKey: string, accountId: string): Promise<void> {
    if (!this.client) {
      throw new Error('Jira client not configured');
    }

    try {
      await this.client.put(`/issue/${issueKey}/assignee`, {
        accountId,
      });
    } catch (error: any) {
      console.error(`Error updating assignee for ${issueKey}:`, error);
      throw new Error(error.response?.data?.errorMessages?.[0] || 'Failed to update assignee');
    }
  }

  async bulkUpdateTickets(
    tickets: JiraTicket[],
    action: 'comment' | 'status' | 'assignee',
    value: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const ticket of tickets) {
      try {
        switch (action) {
          case 'comment':
            await this.addComment(ticket.key, value);
            break;
          case 'status':
            await this.updateStatus(ticket.key, value);
            break;
          case 'assignee':
            await this.updateAssignee(ticket.key, value);
            break;
        }
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${ticket.key}: ${error.message}`);
      }
    }

    return results;
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }
}

export default new JiraService();

