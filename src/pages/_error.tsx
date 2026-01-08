function Error({ statusCode }: { statusCode?: number }) {
  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>{statusCode ? `שגיאה ${statusCode}` : 'שגיאה'}</h1>
      <p>
        {statusCode === 404
          ? 'הדף לא נמצא'
          : 'אירעה שגיאה בשרת'}
      </p>
    </div>
  )
}

Error.getInitialProps = ({ res, err }: any) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error
