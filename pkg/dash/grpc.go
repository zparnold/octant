package dash

import (
	"github.com/vmware-tanzu/octant/pkg/link"
	"net"

	"github.com/vmware-tanzu/octant/pkg/plugin/api"
	"github.com/vmware-tanzu/octant/pkg/plugin/api/proto"

	"github.com/soheilhy/cmux"
	"google.golang.org/grpc"
)

// Do we even need this?
func serveGRPC(l net.Listener, service api.Service, generator link.Interface) {

	dashboardServer := api.NewGRPCServer(service)
	linkGeneratorServer := api.NewLinkGeneratorServer(generator)

	s := grpc.NewServer()
	proto.RegisterDashboardServer(s, dashboardServer)
	proto.RegisterLinkGeneratorServer(s, linkGeneratorServer)

	if err := s.Serve(l); err != cmux.ErrListenerClosed {
		panic(err)
	}
}
