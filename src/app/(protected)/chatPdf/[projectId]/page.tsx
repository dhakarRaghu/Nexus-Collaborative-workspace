
import ChatPdfSection from '@/components/chatPdfSection';
import ChatSection from '@/components/chatPdfSection';
import React from 'react'

interface Props {
  params: Promise<{  projectId: string}>;
}
export  async function ChatPdfPage( props : Props){
  const { projectId } = await props.params;
  return (
    <div>
     <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">Chat Section</h2>
            {/* Pass the project URL as a prop to the chat component (e.g. as namespace) */}
            <ChatPdfSection  projectId={projectId} />
          </div>
    </div>
  )
}
export default ChatPdfPage
